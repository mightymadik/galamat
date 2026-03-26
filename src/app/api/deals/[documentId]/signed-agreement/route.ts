import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

function toDownloadUrl(rawUrl: string, _name: string, baseUrl: string): string {
  return rawUrl.startsWith("http")
    ? rawUrl
    : `${baseUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
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

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?fields[0]=documentId&populate[customer][fields][0]=id&populate[customer][fields][1]=documentId`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const customerId =
      deal?.customer?.id ??
      deal?.attributes?.customer?.id ??
      (deal?.customer?.data as any)?.id ??
      null;
    const customerDocumentId =
      deal?.customer?.documentId ??
      deal?.attributes?.customer?.documentId ??
      (deal?.customer?.data as any)?.documentId ??
      null;
    const isCustomerById = customerId != null && Number(customerId) === Number(payload.sub);
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
    let effectiveRole = payload.role ?? "";
    try {
      const meRoleRes = await strapiAxios.get(
        `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}&pagination[pageSize]=1&fields[0]=role`,
        { headers }
      );
      const me = (meRoleRes.data as any)?.data?.[0];
      const roleFromCustomer = me?.role ?? me?.attributes?.role;
      if (typeof roleFromCustomer === "string" && roleFromCustomer.trim()) {
        effectiveRole = roleFromCustomer.trim();
      }
    } catch {
      // keep role from token
    }
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isAdmin = roleLower === "admin";
    const isManager = roleLower === "manager";
    const isCashier = roleLower === "cashier";
    if (!isCustomer && !isAdmin && !isManager && !isCashier) {
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
        const name = String(fileData?.name ?? fileData?.attributes?.name ?? "").trim();
        const templateType = String(sa?.templateType ?? sa?.attributes?.templateType ?? "Договор").trim() || "Договор";
        const agreementTypeRaw = sa?.agreementType ?? sa?.attributes?.agreementType ?? null;
        const agreementNumberRaw = sa?.agreementNumber ?? sa?.attributes?.agreementNumber ?? null;
        if (!rawUrl || typeof rawUrl !== "string") continue;
        agreements.push({
          url: toDownloadUrl(rawUrl, name || `${templateType}.pdf`, baseUrl),
          name: name || `${templateType}.pdf`,
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
