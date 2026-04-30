import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { sumPaidFromPaymentRows } from "@/lib/paidFromPayments";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

/**
 * Strapi `rest.maxLimit` (по умолчанию 100) — запросы с pageSize=1000 всё равно отдают до 100 строк.
 * Поэтому сделки тянем постранично, а график/оплаты подгружаем populate'ом из самой сделки —
 * это исключает «потерю» строк при глобальной выборке payment-schedules с нестабильной сортировкой.
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
      "&populate[paymentSchedules][fields][0]=documentId" +
      "&populate[paymentSchedules][fields][1]=index" +
      "&populate[paymentSchedules][fields][2]=dueDate" +
      "&populate[paymentSchedules][fields][3]=amount" +
      "&populate[paymentSchedules][fields][4]=paymentStatus" +
      "&populate[payments][fields][0]=documentId" +
      "&populate[payments][fields][1]=amount" +
      "&populate[payments][fields][2]=paymentStatus" +
      "&populate[payments][fields][3]=createdAt" +
      "&populate[payments][fields][4]=confirmedAt" +
      "&populate[payments][populate][confirmedBy][fields][0]=name" +
      "&populate[payments][populate][confirmedBy][fields][1]=surname" +
      "&populate[payments][populate][receipt][fields][0]=url" +
      "&populate[payments][populate][receipt][fields][1]=name" +
      "&populate[payments][populate][receipt][fields][2]=mime" +
      "&fields[0]=documentId&fields[1]=dealStatus&fields[2]=dealPrice&fields[3]=paymentMethod&fields[4]=createdAt";

    let rawDeals: any[] = await fetchAllStrapiList(dealsQuery, headers);
    if (!Array.isArray(rawDeals)) rawDeals = [];

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

      const rawSchedules = (() => {
        const rel = d?.paymentSchedules ?? d?.attributes?.paymentSchedules;
        const data = (rel as any)?.data ?? rel;
        return Array.isArray(data) ? data : [];
      })();
      const paymentSchedules = rawSchedules
        .map((s: any) => ({
          documentId: s?.documentId ?? s?.id,
          index: s?.index ?? s?.attributes?.index,
          dueDate: s?.dueDate ?? s?.attributes?.dueDate,
          amount: s?.amount ?? s?.attributes?.amount,
          paymentStatus: s?.paymentStatus ?? s?.attributes?.paymentStatus,
        }))
        .sort((a: any, b: any) => (Number(a.index) || 0) - (Number(b.index) || 0));

      const rawPayments = (() => {
        const rel = d?.payments ?? d?.attributes?.payments;
        const data = (rel as any)?.data ?? rel;
        return Array.isArray(data) ? data : [];
      })();
      const payments = rawPayments.map((pp: any) => {
        const confBy = pp?.confirmedBy ?? pp?.attributes?.confirmedBy;
        const confByData = (confBy as any)?.data ?? confBy;
        const cbName = confByData?.name ?? confByData?.attributes?.name ?? "";
        const cbSurname = confByData?.surname ?? confByData?.attributes?.surname ?? "";
        const confirmedByDisplayName = [cbSurname, cbName].filter(Boolean).join(" ").trim() || null;
        const receiptRel = pp?.receipt ?? pp?.attributes?.receipt;
        const receiptData = (receiptRel as any)?.data ?? receiptRel;
        const receiptList = Array.isArray(receiptData)
          ? receiptData
          : receiptData
            ? [receiptData]
            : [];
        const firstReceipt = receiptList[0] || null;
        return {
          documentId: pp?.documentId ?? pp?.id,
          amount: pp?.amount ?? pp?.attributes?.amount,
          paymentStatus: pp?.paymentStatus ?? pp?.attributes?.paymentStatus,
          createdAt: pp?.createdAt ?? pp?.attributes?.createdAt,
          confirmedAt: pp?.confirmedAt ?? pp?.attributes?.confirmedAt,
          confirmedByDisplayName,
          receiptUrl: firstReceipt?.url ?? firstReceipt?.attributes?.url ?? null,
          receiptName: firstReceipt?.name ?? firstReceipt?.attributes?.name ?? null,
        };
      });

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
        paymentSchedules,
        payments,
      };
    });

    return NextResponse.json({ deals });
  } catch (err: any) {
    console.error("[cashier/deals]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
