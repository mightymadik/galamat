import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";

function inferFilename(path: string): string | null {
  const tail = path.split("/").pop()?.trim();
  if (!tail) return null;
  try {
    const decoded = decodeURIComponent(tail).trim();
    return decoded || null;
  } catch {
    return tail || null;
  }
}

function extractNameFromRequestPath(req: Request): string | null {
  const pathname = new URL(req.url).pathname;
  const marker = "/api/media/file/";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return null;
  const raw = pathname.slice(idx + marker.length).trim();
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return raw || null;
  }
}

function guessMimeFromPath(path: string, upstream: string): string {
  const u = upstream.toLowerCase().split(";")[0].trim();
  if (u && u !== "application/octet-stream" && u !== "binary/octet-stream") return upstream.split(";")[0].trim();
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  return upstream.split(";")[0].trim() || "application/octet-stream";
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

/**
 * Прокси файлов из Strapi /uploads. Доступ только с валидным JWT (cookie или Bearer).
 * Защита глубже — закрыть прямой доступ к Strapi /uploads на nginx/сети.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
    const requestedName =
      searchParams.get("name")?.trim() || extractNameFromRequestPath(req) || "";
  if (!path || !path.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  const headers = getStrapiHeaders();
  // If the file is a signed agreement upload, enforce deal-level access.
  try {
    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements?` +
        `filters[signedAgreement][url][$eq]=${encodeURIComponent(path)}` +
        `&pagination[pageSize]=1` +
        `&populate[deal][fields][0]=documentId` +
        `&populate[deal][populate][customer][fields][0]=id` +
        `&populate[deal][populate][customer][fields][1]=documentId` +
        `&populate[deal][populate][manager][fields][0]=id`,
      { headers }
    );
    const saRow: any = (saRes.data as any)?.data?.[0] ?? null;
    if (saRow) {
      const deal = saRow?.deal ?? saRow?.attributes?.deal;
      const dealNode = (deal as any)?.data ?? deal;
      if (!dealNode) return NextResponse.json({ error: "forbidden" }, { status: 403 });

      const rawCustomer = dealNode?.customer ?? dealNode?.attributes?.customer;
      const customerNode = (rawCustomer as any)?.data ?? rawCustomer;
      const dealCustomerIdRaw = customerNode?.id ?? customerNode?.attributes?.id ?? null;
      const dealCustomerDocIdRaw =
        customerNode?.documentId ?? customerNode?.attributes?.documentId ?? null;
      const dealCustomerId = dealCustomerIdRaw != null ? Number(dealCustomerIdRaw) : null;
      const isCustomerById =
        dealCustomerId != null && Number.isFinite(dealCustomerId) && dealCustomerId === Number(payload.sub);
      let isCustomerByDocumentId = false;
      if (!isCustomerById && dealCustomerDocIdRaw != null) {
        try {
          const meRes = await strapiAxios.get(
            `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}&pagination[pageSize]=1&fields[0]=documentId`,
            { headers }
          );
          const me = (meRes.data as any)?.data?.[0];
          const meDocId = me?.documentId ?? me?.attributes?.documentId ?? null;
          isCustomerByDocumentId = meDocId != null && String(meDocId) === String(dealCustomerDocIdRaw);
        } catch {
          isCustomerByDocumentId = false;
        }
      }
      const isCustomer = isCustomerById || isCustomerByDocumentId;

      const effectiveRole = await resolveEffectiveRole(payload, base, headers);
      const roleLower = String(effectiveRole || "").toLowerCase();
      const isStaff = roleLower === "admin" || roleLower === "manager" || roleLower === "cashier" || roleLower === "rop";
      if (isStaff && roleLower === "manager" && managerForbiddenForDeal(effectiveRole, payload.sub, dealNode)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (!isCustomer && !isStaff) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }
  } catch {
    // If lookup fails, fall back to legacy behavior to avoid breaking public assets.
  }
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "galamat-media-file-proxy" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    const rawType = res.headers.get("content-type") || "application/octet-stream";
    const contentType = guessMimeFromPath(path, rawType);
    const fileName = requestedName || inferFilename(path) || "file";
    const safeAsciiName = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "");
    const disposition =
      `inline; filename="${safeAsciiName || "file"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[media/file]", msg);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
