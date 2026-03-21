import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * GET: возвращает URL подписанного договора по сделке (для скачивания).
 * Доступно только клиенту этой сделки или менеджеру/админу.
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
    if (!isCustomer && !isAdmin && !isManager) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1&populate[signedAgreement][fields][0]=url`,
      { headers }
    );
    const saList: any[] = (saRes.data as any)?.data ?? [];
    const sa = Array.isArray(saList) ? saList[0] : null;
    if (!sa) return NextResponse.json({ error: "Договор не найден" }, { status: 404 });

    const file = sa?.signedAgreement ?? sa?.attributes?.signedAgreement;
    const fileData = (file as any)?.data ?? file;
    const url = fileData?.url ?? fileData?.attributes?.url;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Файл договора не найден" }, { status: 404 });
    }

    const path = url.startsWith("http") ? new URL(url).pathname : (url.startsWith("/") ? url : `/${url}`);
    const fileUrl = path.startsWith("/uploads/")
      ? `/api/strapi-file?path=${encodeURIComponent(path)}`
      : (url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`);

    return NextResponse.json({ url: fileUrl });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    return NextResponse.json({ error: "server_error" }, { status: status ?? 500 });
  }
}
