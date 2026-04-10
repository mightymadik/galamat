import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole, managerForbiddenForDeal } from "@/lib/dealManagerAuth";
import { toClientMediaUrl } from "@/lib/uploadsProxyUrl";

function dealCustomerIds(deal: any): { id: number | null; documentId: string | null } {
  const raw = deal?.customer ?? deal?.attributes?.customer;
  const node = raw?.data ?? raw;
  if (!node || typeof node !== "object") return { id: null, documentId: null };
  const idRaw = (node as { id?: unknown }).id ?? (node as { attributes?: { id?: unknown } }).attributes?.id;
  const docRaw =
    (node as { documentId?: unknown }).documentId ??
    (node as { attributes?: { documentId?: unknown } }).attributes?.documentId;
  const id = idRaw != null ? Number(idRaw) : null;
  return {
    id: id != null && Number.isFinite(id) ? id : null,
    documentId: docRaw != null && docRaw !== "" ? String(docRaw) : null,
  };
}

function toDownloadUrl(rawUrl: string, _name: string, baseUrl: string): string {
  return rawUrl.startsWith("http")
    ? rawUrl
    : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
}

function extFromUrl(url: string): string | null {
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, "http://local");
    const p = u.pathname || "";
    const m = p.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] ? m[1] : null;
  } catch {
    const m = url.toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] ? m[1] : null;
  }
}

function ensureExtension(name: string, ext: string): string {
  const n = String(name || "").trim();
  if (!n) return `document.${ext}`;
  if (/\.[a-z0-9]+$/i.test(n)) return n;
  return `${n}.${ext}`;
}

/**
 * GET: возвращает URL подписанного договора по сделке (для скачивания).
 * Доступно клиенту этой сделки, менеджеру, кассиру или админу.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const baseUrl = base.replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const strapiOrigin = baseUrl;

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(documentId)}?populate[customer]=true&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const { id: customerNumericId, documentId: customerDocumentId } = dealCustomerIds(deal);
    const isCustomerById =
      customerNumericId != null && Number(customerNumericId) === Number(payload.sub);
    let isCustomerByDocumentId = false;
    if (!isCustomerById && customerDocumentId != null) {
      try {
        const meRes = await strapiAxios.get(
          `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}&pagination[pageSize]=1&fields[0]=documentId`,
          { headers }
        );
        const me = (meRes.data as any)?.data?.[0];
        const meDocId = me?.documentId ?? me?.attributes?.documentId ?? null;
        isCustomerByDocumentId = meDocId != null && String(meDocId) === String(customerDocumentId);
      } catch {
        isCustomerByDocumentId = false;
      }
    }
    const isCustomer = isCustomerById || isCustomerByDocumentId;

    const effectiveRole = await resolveEffectiveRole(payload, strapiOrigin, headers);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isStaff = ["admin", "manager", "cashier", "rop"].includes(roleLower);

    if (isStaff && roleLower === "manager" && managerForbiddenForDeal(effectiveRole, payload.sub, deal)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!isCustomer && !isStaff) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const agreements: Array<{
      url: string;
      name: string;
      templateType: string;
      agreementType: string | null;
      agreementNumber: string | null;
      signedAt: string | null;
      createdAt: string | null;
    }> = [];
    const pageSize = 200;
    let page = 1;
    let pageCount = 1;

    do {
      const saRes = await strapiAxios.get(
        `${base}/api/signed-agreements` +
          `?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}` +
          `&sort[0]=createdAt:desc` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `&fields[0]=signedAt&fields[1]=createdAt&fields[2]=templateType&fields[3]=agreementType&fields[4]=agreementNumber` +
          `&populate[signedAgreement][fields][0]=url`,
        { headers }
      );
      const saList: any[] = (saRes.data as any)?.data ?? [];
      const meta = (saRes.data as any)?.meta?.pagination;
      pageCount = Number(meta?.pageCount ?? 1);
      page += 1;

      for (const sa of saList) {
        const file = sa?.signedAgreement ?? sa?.attributes?.signedAgreement;
        const fileData = (file as any)?.data ?? file;
        const rawUrl = fileData?.url ?? fileData?.attributes?.url;
        const upstreamName = String(fileData?.name ?? fileData?.attributes?.name ?? "").trim();
        const templateType = String(sa?.templateType ?? sa?.attributes?.templateType ?? "Договор").trim() || "Договор";
        const agreementTypeRaw = sa?.agreementType ?? sa?.attributes?.agreementType ?? null;
        const agreementNumberRaw = sa?.agreementNumber ?? sa?.attributes?.agreementNumber ?? null;
        if (!rawUrl || typeof rawUrl !== "string") continue;
        const ext = extFromUrl(rawUrl) ?? (upstreamName.toLowerCase().endsWith(".docx") ? "docx" : upstreamName.toLowerCase().endsWith(".pdf") ? "pdf" : "pdf");
        const displayName = upstreamName ? upstreamName : ensureExtension(templateType, ext);
        agreements.push({
          url: toClientMediaUrl(toDownloadUrl(rawUrl, displayName, baseUrl), displayName),
          name: displayName,
          templateType,
          agreementType: agreementTypeRaw ? String(agreementTypeRaw) : null,
          agreementNumber: agreementNumberRaw ? String(agreementNumberRaw) : null,
          signedAt: sa?.signedAt ?? sa?.attributes?.signedAt ?? null,
          createdAt: sa?.createdAt ?? sa?.attributes?.createdAt ?? null,
        });
      }
    } while (page <= pageCount);

    if (agreements.length === 0) {
      return NextResponse.json({ error: "Файл договора не найден" }, { status: 404 });
    }
    return NextResponse.json({
      url: agreements[0].url,
      urls: agreements.map((a) => a.url),
      agreements,
    });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    return NextResponse.json({ error: "server_error" }, { status: status ?? 500 });
  }
}
