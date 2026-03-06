import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * GET /api/manager/agreements
 * Список сделок текущего менеджера с информацией о договоре (подписан/дата) для раздела «Договора».
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let isManager = payload.role === "manager" || payload.role === "admin";
    let isAdmin = payload.role === "admin";
    if (!isManager) {
      const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
      const headers = getStrapiHeaders();
      const customerRes = await strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
        .catch(() => null);
      const customer: any = (customerRes?.data as any)?.data?.[0];
      const currentRole = customer?.role ?? customer?.attributes?.role ?? payload.role;
      isManager = currentRole === "manager" || currentRole === "admin";
      isAdmin = currentRole === "admin";
    }
    if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const managerId = payload.sub;

    const baseDealsQuery =
      `sort[0]=createdAt:desc` +
      `&pagination[pageSize]=500` +
      `&populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber` +
      `&populate[property][populate][project][fields][0]=projectName` +
      `&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone` +
      `&populate[manager][fields][0]=name&populate[manager][fields][1]=surname` +
      `&fields[0]=documentId&fields[1]=dealStatus&fields[2]=createdAt`;

    const dealsUrl = isAdmin
      ? `${base}/api/deals?${baseDealsQuery}`
      : `${base}/api/deals?filters[manager][id][$eq]=${encodeURIComponent(managerId)}&${baseDealsQuery}`;

    const dealsRes = await strapiAxios.get(dealsUrl, { headers });
    let rawDeals: any[] = (dealsRes.data as any)?.data ?? [];
    if (!Array.isArray(rawDeals)) rawDeals = [];

    if (rawDeals.length === 0 && !isAdmin) {
      const byDocIdUrl =
        `${base}/api/deals?filters[manager][documentId][$eq]=${encodeURIComponent(String(managerId))}&${baseDealsQuery}`;
      const res2 = await strapiAxios.get(byDocIdUrl, { headers }).catch(() => ({ data: {} }));
      rawDeals = (res2.data as any)?.data ?? [];
      if (!Array.isArray(rawDeals)) rawDeals = [];
    }

    const dealIds = rawDeals.map((d: any) => d?.documentId ?? d?.id).filter(Boolean);
    const saByDeal: Record<string, { signed: boolean; signedAt: string | null }> = {};
    if (dealIds.length > 0) {
      const inParams = dealIds
        .slice(0, 100)
        .map((id, i) => `filters[deal][documentId][$in][${i}]=${encodeURIComponent(id)}`)
        .join("&");
      const saRes = await strapiAxios.get(
        `${base}/api/signed-agreements?${inParams}` +
          `&sort[0]=createdAt:desc` +
          `&pagination[pageSize]=500` +
          `&fields[0]=signed&fields[1]=signedAt` +
          `&populate[deal][fields][0]=documentId`,
        { headers }
      ).catch(() => ({ data: { data: [] } }));
      const saList: any[] = (saRes.data as any)?.data ?? [];
      for (const sa of saList) {
        const dealRel = sa?.deal ?? sa?.attributes?.deal;
        const dealData = (dealRel as any)?.data ?? dealRel;
        const docId = dealData?.documentId ?? dealData?.id;
        if (docId && !saByDeal[docId]) {
          saByDeal[docId] = {
            signed: sa?.signed ?? sa?.attributes?.signed ?? false,
            signedAt: sa?.signedAt ?? sa?.attributes?.signedAt ?? null,
          };
        }
      }
    }

    const agreements = rawDeals.map((d: any) => {
      const docId = String(d?.documentId ?? d?.id ?? "");
      const prop = d?.property ?? d?.attributes?.property;
      const propData = (prop as any)?.data ?? prop;
      const cust = d?.customer ?? d?.attributes?.customer;
      const custData = (cust as any)?.data ?? cust;
      const name = custData?.name ?? custData?.attributes?.name ?? "";
      const surname = custData?.surname ?? custData?.attributes?.surname ?? "";
      const clientName = [surname, name].filter(Boolean).join(" ").trim() || "—";
      const mgr = d?.manager ?? d?.attributes?.manager;
      const mgrData = (mgr as any)?.data ?? mgr;
      const mgrName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
      const mgrSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
      const managerDisplayName = [mgrSurname, mgrName].filter(Boolean).join(" ").trim() || "—";
      const projectName = propData?.project?.projectName ?? propData?.project?.attributes?.projectName ?? "";
      const apartmentNumber = propData?.apartmentNumber ?? propData?.attributes?.apartmentNumber ?? "";
      const sa = saByDeal[docId] ?? null;
      return {
        dealDocumentId: docId,
        dealStatus: d?.dealStatus ?? d?.attributes?.dealStatus ?? "",
        createdAt: d?.createdAt ?? d?.attributes?.createdAt ?? null,
        customer: { name, surname, displayName: clientName },
        manager: managerDisplayName ? { displayName: managerDisplayName } : null,
        property: {
          projectName,
          apartmentNumber,
        },
        signedAgreement: sa ? { signed: sa.signed, signedAt: sa.signedAt } : null,
      };
    });

    return NextResponse.json({ agreements });
  } catch (err: any) {
    console.error("[manager/agreements]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
