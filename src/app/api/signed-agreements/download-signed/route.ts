import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";

/** Эндпоинт только для PDF договора — всегда inline, чтобы вкладка, а не «Сохранить». */
function normalizePdfContentType(raw: string | null): string {
  if (!raw?.trim()) return "application/pdf";
  const base = raw.split(";")[0].trim().toLowerCase();
  if (base === "application/octet-stream" || base === "binary/octet-stream") return "application/pdf";
  return raw.split(";")[0].trim();
}

function extractFileNameFromDisposition(raw: string | null): string | null {
  if (!raw) return null;
  const utf8Match = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1]).trim();
      if (decoded) return decoded;
    } catch {
      // ignore malformed upstream encoding
    }
  }
  const plainMatch = raw.match(/filename="?([^"]+)"?/i);
  const plain = plainMatch?.[1]?.trim();
  return plain || null;
}

function extractNameFromRequestPath(req: Request): string | null {
  const pathname = new URL(req.url).pathname;
  const marker = "/api/signed-agreements/download-signed/";
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

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return new NextResponse("unauthorized", { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return new NextResponse("unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const doodocsDocumentId = searchParams.get("doodocsDocumentId");
    const dealDocumentId = searchParams.get("dealDocumentId");
    if (!doodocsDocumentId)
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    if (!dealDocumentId)
      return NextResponse.json({ error: "dealDocumentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const strapiOrigin = base;

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?populate[customer][fields][0]=id&populate[customer][fields][1]=documentId&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "deal_not_found" }, { status: 404 });

    const rawCustomer = deal?.customer ?? deal?.attributes?.customer;
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

    const effectiveRole = await resolveEffectiveRole(payload, strapiOrigin, headers);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isStaff =
      roleLower === "admin" ||
      roleLower === "manager" ||
      roleLower === "cashier" ||
      roleLower === "rop" ||
      roleLower === "lawyer";
    if (isStaff && roleLower === "manager" && managerForbiddenForDeal(effectiveRole, payload.sub, deal)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!isCustomer && !isStaff) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const backendUrl = `${base}/api/signed-agreements/download-signed?doodocsDocumentId=${encodeURIComponent(doodocsDocumentId)}${dealDocumentId ? `&dealDocumentId=${encodeURIComponent(dealDocumentId)}` : ""}`;
    const res = await fetch(
      backendUrl,
      { headers, signal: AbortSignal.timeout(60_000) }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "download_failed");
      return new NextResponse(text, { status: res.status });
    }

    const contentType = normalizePdfContentType(res.headers.get("content-type"));
    const upstreamDisposition = res.headers.get("content-disposition");
    const upstreamName = extractFileNameFromDisposition(upstreamDisposition);
    const pathName = extractNameFromRequestPath(req);
    const fileName = pathName || upstreamName || "signed-agreement.pdf";
    const safeAsciiName = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "");

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition":
          `inline; filename="${safeAsciiName || "signed-agreement.pdf"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (e: any) {
    console.error("[download-signed proxy]", e?.message);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
