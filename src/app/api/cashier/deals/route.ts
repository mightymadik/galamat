import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { sumPaidFromPaymentRows } from "@/lib/paidFromPayments";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

/**
 * Strapi `rest.maxLimit` (по умолчанию 100) — запросы с pageSize=1000 всё равно отдают до 100 строк.
 * На проде с большим числом графиков без постранички виден только «первый транш» по сделкам.
 */
const STRAPI_PAGE = 100;

async function fetchAllStrapiList(
  pathAndQuery: string,
  headers: Record<string, string>
): Promise<any[]> {
  const base = getStrapiBaseUrl().replace(/\/$/, "");
  const all: any[] = [];
  const maxPages = 200;
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = pathAndQuery.includes("?") ? "&" : "?";
    const url = `${base}${pathAndQuery}${sep}pagination[pageSize]=${STRAPI_PAGE}&pagination[page]=${page}`;
    const res = await strapiAxios.get(url, { headers });
    const chunk: any[] = (res.data as any)?.data ?? [];
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    const pagination = (res.data as any)?.meta?.pagination;
    if (typeof pagination?.pageCount === "number" && page >= pagination.pageCount) break;
    if (chunk.length < STRAPI_PAGE) break;
  }
  return all;
}

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

    const origin = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const originHeaders = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, origin, originHeaders);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isCashier = roleLower === "cashier" || roleLower === "admin";
    if (!isCashier) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const headers = getStrapiHeaders();

    const dealsQuery =
      "/api/deals" +
      "?sort[0]=createdAt:desc" +
      "&populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber" +
      "&populate[property][populate][project][fields][0]=projectName" +
      "&populate[commerce][fields][0]=documentId&populate[commerce][fields][1]=commerceNumber" +
      "&populate[commerce][populate][project][fields][0]=projectName" +
      "&populate[parking][fields][0]=documentId&populate[parking][fields][1]=parkingNumber" +
      "&populate[parking][populate][project][fields][0]=projectName" +
      "&populate[pantry][fields][0]=documentId&populate[pantry][fields][1]=numberPantry" +
      "&populate[pantry][populate][project][fields][0]=projectName" +
      "&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone" +
      "&populate[manager][fields][0]=name&populate[manager][fields][1]=surname" +
      "&fields[0]=documentId&fields[1]=dealStatus&fields[2]=dealPrice&fields[3]=paymentMethod&fields[4]=createdAt";

    let rawDeals: any[] = await fetchAllStrapiList(dealsQuery, headers);
    if (!Array.isArray(rawDeals)) rawDeals = [];

    const dealIdSet = new Set(rawDeals.map((d: any) => String(d?.documentId ?? d?.id ?? "")).filter(Boolean));
    const schedulesByDeal: Record<string, any[]> = {};
    const paymentsByDeal: Record<string, any[]> = {};

    let scheduleList: any[] = [];
    try {
      scheduleList = await fetchAllStrapiList(
        "/api/payment-schedules" +
          "?sort[0]=index:asc" +
          "&fields[0]=documentId&fields[1]=index&fields[2]=dueDate&fields[3]=amount&fields[4]=paymentStatus" +
          "&populate[deal][fields][0]=documentId",
        headers
      );
    } catch {
      scheduleList = [];
    }
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

    let paymentsList: any[] = [];
    try {
      paymentsList = await fetchAllStrapiList(
        "/api/payments" +
          "?sort[0]=createdAt:desc" +
          "&fields[0]=documentId&fields[1]=amount&fields[2]=paymentStatus&fields[3]=createdAt&fields[4]=confirmedAt" +
          "&populate[deal][fields][0]=documentId" +
          "&populate[confirmedBy][fields][0]=name&populate[confirmedBy][fields][1]=surname" +
          "&populate[receipt][fields][0]=url&populate[receipt][fields][1]=name&populate[receipt][fields][2]=mime",
        headers
      );
    } catch {
      paymentsList = [];
    }
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
        const receiptRel = p?.receipt ?? p?.attributes?.receipt;
        const receiptData = (receiptRel as any)?.data ?? receiptRel;
        const receiptUrl = receiptData?.url ?? null;
        const receiptName = receiptData?.name ?? null;

        paymentsByDeal[docId].push({
          documentId: p?.documentId ?? p?.id,
          amount: p?.amount ?? p?.attributes?.amount,
          paymentStatus: p?.paymentStatus ?? p?.attributes?.paymentStatus,
          createdAt: p?.createdAt ?? p?.attributes?.createdAt,
          confirmedAt: p?.confirmedAt ?? p?.attributes?.confirmedAt,
          confirmedByDisplayName,
          receiptUrl,
          receiptName,
        });
      }
    }

    const deals = rawDeals.map((d: any) => {
      const docId = String(d?.documentId ?? d?.id ?? "");
      const property = (d?.property ?? d?.attributes?.property) as any;
      const commerce = (d?.commerce ?? d?.attributes?.commerce) as any;
      const parking = (d?.parking ?? d?.attributes?.parking) as any;
      const pantry = (d?.pantry ?? d?.attributes?.pantry) as any;
      const p = (property?.data ?? property) || null;
      const c = (commerce?.data ?? commerce) || null;
      const pk = (parking?.data ?? parking) || null;
      const pt = (pantry?.data ?? pantry) || null;
      const entityType: "property" | "commerce" | "parking" | "pantry" =
        p?.documentId ? "property" : c?.documentId ? "commerce" : pk?.documentId ? "parking" : "pantry";
      const entity = entityType === "property" ? p : entityType === "commerce" ? c : entityType === "parking" ? pk : pt;
      const cust = d?.customer ?? d?.attributes?.customer;
      const custData = (cust as any)?.data ?? cust;
      const clientName = [custData?.surname, custData?.name].filter(Boolean).join(" ").trim() || "—";
      const mgr = d?.manager ?? d?.attributes?.manager;
      const mgrData = (mgr as any)?.data ?? mgr;
      const mgrName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
      const mgrSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
      const managerDisplayName = [mgrSurname, mgrName].filter(Boolean).join(" ").trim() || null;
      const payments = paymentsByDeal[docId] ?? [];
      return {
        documentId: docId,
        dealStatus: d?.dealStatus ?? d?.attributes?.dealStatus,
        createdAt: d?.createdAt ?? d?.attributes?.createdAt ?? null,
        dealPrice: d?.dealPrice ?? d?.attributes?.dealPrice,
        paidAmount: sumPaidFromPaymentRows(payments),
        paymentMethod: d?.paymentMethod ?? d?.attributes?.paymentMethod,
        property: {
          projectName: entity?.project?.projectName ?? entity?.project?.attributes?.projectName,
          apartmentNumber:
            entityType === "property"
              ? (entity?.apartmentNumber ?? entity?.attributes?.apartmentNumber)
              : entityType === "commerce"
                ? (entity?.commerceNumber ?? entity?.attributes?.commerceNumber)
                : entityType === "parking"
                  ? (entity?.parkingNumber ?? entity?.attributes?.parkingNumber)
                  : (entity?.numberPantry ?? entity?.attributes?.numberPantry),
          type: entityType,
          typeLabel: entityType === "commerce" ? "Коммерция" : entityType === "parking" ? "Паркинг" : entityType === "pantry" ? "Кладовка" : "Квартира",
        },
        customer: { displayName: clientName, phone: custData?.phone ?? custData?.attributes?.phone },
        manager: managerDisplayName ? { displayName: managerDisplayName } : null,
        paymentSchedules: (schedulesByDeal[docId] ?? []).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0)),
        payments,
      };
    });

    return NextResponse.json({ deals });
  } catch (err: any) {
    console.error("[cashier/deals]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
