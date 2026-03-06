import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * GET /api/cashier/deals
 * Список сделок с графиком платежей и оплатами для кассира (все сделки, не только своего менеджера).
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    let isCashier = payload.role === "cashier" || payload.role === "admin";
    if (!isCashier) {
      const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
      const headers = getStrapiHeaders();
      const customerRes = await strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
        .catch(() => null);
      const customer: any = (customerRes?.data as any)?.data?.[0];
      const currentRole = customer?.role ?? customer?.attributes?.role ?? payload.role;
      isCashier = currentRole === "cashier" || currentRole === "admin";
    }
    if (!isCashier) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealsRes = await strapiAxios.get(
      `${base}/api/deals` +
        "?sort[0]=createdAt:desc" +
        "&pagination[pageSize]=300" +
        "&populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber" +
        "&populate[property][populate][project][fields][0]=projectName" +
        "&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone" +
        "&populate[manager][fields][0]=name&populate[manager][fields][1]=surname" +
        "&fields[0]=documentId&fields[1]=dealStatus&fields[2]=dealPrice&fields[3]=paidAmount&fields[4]=paymentMethod",
      { headers }
    );
    let rawDeals: any[] = (dealsRes.data as any)?.data ?? [];
    if (!Array.isArray(rawDeals)) rawDeals = [];

    const dealIdSet = new Set(rawDeals.map((d: any) => String(d?.documentId ?? d?.id ?? "")).filter(Boolean));
    const schedulesByDeal: Record<string, any[]> = {};
    const paymentsByDeal: Record<string, any[]> = {};

    const scheduleRes = await strapiAxios.get(
      `${base}/api/payment-schedules` +
        "?sort[0]=index:asc" +
        "&pagination[pageSize]=1000" +
        "&fields[0]=documentId&fields[1]=index&fields[2]=dueDate&fields[3]=amount&fields[4]=paymentStatus" +
        "&populate[deal][fields][0]=documentId",
      { headers }
    ).catch(() => ({ data: { data: [] } }));
    const scheduleList: any[] = (scheduleRes.data as any)?.data ?? [];
    for (const s of scheduleList) {
      const dealRel = s?.deal ?? s?.attributes?.deal;
      const dealData = (dealRel as any)?.data ?? dealRel;
      const docId = dealData?.documentId ?? dealData?.id;
      if (docId && dealIdSet.has(String(docId))) {
        if (!schedulesByDeal[docId]) schedulesByDeal[docId] = [];
        schedulesByDeal[docId].push({
          documentId: s?.documentId ?? s?.id,
          index: s?.index ?? s?.attributes?.index,
          dueDate: s?.dueDate ?? s?.attributes?.dueDate,
          amount: s?.amount ?? s?.attributes?.amount,
          paymentStatus: s?.paymentStatus ?? s?.attributes?.paymentStatus,
        });
      }
    }

    const paymentsRes = await strapiAxios.get(
      `${base}/api/payments` +
        "?sort[0]=createdAt:desc" +
        "&pagination[pageSize]=1000" +
        "&fields[0]=documentId&fields[1]=amount&fields[2]=paymentStatus&fields[3]=createdAt&fields[4]=confirmedAt" +
        "&populate[deal][fields][0]=documentId" +
        "&populate[confirmedBy][fields][0]=name&populate[confirmedBy][fields][1]=surname",
      { headers }
    ).catch(() => ({ data: { data: [] } }));
    const paymentsList: any[] = (paymentsRes.data as any)?.data ?? [];
    for (const p of paymentsList) {
      const dealRel = p?.deal ?? p?.attributes?.deal;
      const dealData = (dealRel as any)?.data ?? dealRel;
      const docId = dealData?.documentId ?? dealData?.id;
      if (docId && dealIdSet.has(String(docId))) {
        const confBy = p?.confirmedBy ?? p?.attributes?.confirmedBy;
        const confByData = (confBy as any)?.data ?? confBy;
        const cbName = confByData?.name ?? confByData?.attributes?.name ?? "";
        const cbSurname = confByData?.surname ?? confByData?.attributes?.surname ?? "";
        const confirmedByDisplayName = [cbSurname, cbName].filter(Boolean).join(" ").trim() || null;
        if (!paymentsByDeal[docId]) paymentsByDeal[docId] = [];
        paymentsByDeal[docId].push({
          documentId: p?.documentId ?? p?.id,
          amount: p?.amount ?? p?.attributes?.amount,
          paymentStatus: p?.paymentStatus ?? p?.attributes?.paymentStatus,
          createdAt: p?.createdAt ?? p?.attributes?.createdAt,
          confirmedAt: p?.confirmedAt ?? p?.attributes?.confirmedAt,
          confirmedByDisplayName,
        });
      }
    }

    const deals = rawDeals.map((d: any) => {
      const docId = String(d?.documentId ?? d?.id ?? "");
      const prop = d?.property ?? d?.attributes?.property;
      const propData = (prop as any)?.data ?? prop;
      const cust = d?.customer ?? d?.attributes?.customer;
      const custData = (cust as any)?.data ?? cust;
      const clientName = [custData?.surname, custData?.name].filter(Boolean).join(" ").trim() || "—";
      const mgr = d?.manager ?? d?.attributes?.manager;
      const mgrData = (mgr as any)?.data ?? mgr;
      const mgrName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
      const mgrSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
      const managerDisplayName = [mgrSurname, mgrName].filter(Boolean).join(" ").trim() || null;
      return {
        documentId: docId,
        dealStatus: d?.dealStatus ?? d?.attributes?.dealStatus,
        dealPrice: d?.dealPrice ?? d?.attributes?.dealPrice,
        paidAmount: d?.paidAmount ?? d?.attributes?.paidAmount ?? 0,
        paymentMethod: d?.paymentMethod ?? d?.attributes?.paymentMethod,
        property: {
          projectName: propData?.project?.projectName ?? propData?.project?.attributes?.projectName,
          apartmentNumber: propData?.apartmentNumber ?? propData?.attributes?.apartmentNumber,
        },
        customer: { displayName: clientName, phone: custData?.phone ?? custData?.attributes?.phone },
        manager: managerDisplayName ? { displayName: managerDisplayName } : null,
        paymentSchedules: (schedulesByDeal[docId] ?? []).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)),
        payments: paymentsByDeal[docId] ?? [],
      };
    });

    return NextResponse.json({ deals });
  } catch (err: any) {
    console.error("[cashier/deals]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
