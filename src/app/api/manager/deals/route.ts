import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { PAID_PAYMENT_STATUS } from "@/lib/paidFromPayments";

/** Колонки Kanban в порядке отображения */
export const DEAL_STATUS_COLUMNS = [
  "Бронь",
  "Ожидания оплаты",
  "Оплачено",
  "Ожидания договора",
  "Договор подписан",
  "Просрочен",
  "Отменен",
] as const;

export type DealStatusColumn = (typeof DEAL_STATUS_COLUMNS)[number];

/**
 * GET /api/manager/deals
 * Сделки текущего менеджера для Kanban.
 * Query: search (ФИО/квартира), project, paymentMethod, overdue (1), onlyMine (1), excludeCancelled (1), createdAtFrom (YYYY-MM-DD), createdAtTo (YYYY-MM-DD)
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const project = searchParams.get("project")?.trim() || "";
    const paymentMethod = searchParams.get("paymentMethod")?.trim() || "";
    const createdAtFrom = searchParams.get("createdAtFrom")?.trim() || "";
    const createdAtTo = searchParams.get("createdAtTo")?.trim() || "";
    const overdue = searchParams.get("overdue") === "1";
    const excludeCancelled = searchParams.get("excludeCancelled") !== "0";

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const managerId = payload.sub;

    let filters: string[] = [];
    if (!isAdmin) {
      filters.push(`filters[manager][id][$eq]=${encodeURIComponent(managerId)}`);
    }

    if (excludeCancelled) {
      filters.push(`filters[dealStatus][$ne]=${encodeURIComponent("Отменен")}`);
    }

    if (project) {
      filters.push(
        `filters[$or][0][property][project][projectName][$eq]=${encodeURIComponent(project)}` +
        `&filters[$or][1][commerce][project][projectName][$eq]=${encodeURIComponent(project)}` +
        `&filters[$or][2][parking][project][projectName][$eq]=${encodeURIComponent(project)}` +
        `&filters[$or][3][pantry][project][projectName][$eq]=${encodeURIComponent(project)}`
      );
    }

    if (paymentMethod) {
      filters.push(`filters[paymentMethod][$eq]=${encodeURIComponent(paymentMethod)}`);
    }
    if (createdAtFrom) {
      filters.push(`filters[createdAt][$gte]=${encodeURIComponent(`${createdAtFrom}T00:00:00.000Z`)}`);
    }
    if (createdAtTo) {
      filters.push(`filters[createdAt][$lte]=${encodeURIComponent(`${createdAtTo}T23:59:59.999Z`)}`);
    }

    const sort = "sort[0]=createdAt:desc";
    const pagination = "pagination[pageSize]=200";
    const populate =
      "populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber&populate[property][populate][project][fields][0]=projectName" +
      "&populate[commerce][fields][0]=documentId&populate[commerce][fields][1]=commerceNumber&populate[commerce][populate][project][fields][0]=projectName" +
      "&populate[parking][fields][0]=documentId&populate[parking][fields][1]=parkingNumber&populate[parking][populate][project][fields][0]=projectName" +
      "&populate[pantry][fields][0]=documentId&populate[pantry][fields][1]=numberPantry&populate[pantry][populate][project][fields][0]=projectName" +
      "&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone" +
      "&populate[manager][fields][0]=name&populate[manager][fields][1]=surname";

    const url =
      `${base}/api/deals?${filters.join("&")}&${sort}&${pagination}&${populate}` +
      "&fields[0]=documentId&fields[1]=dealStatus&fields[2]=dealPrice&fields[3]=downPayment&fields[4]=reserveSum&fields[5]=expiresAt&fields[6]=paymentMethod&fields[7]=createdAt";

    const res = await strapiAxios.get(url, { headers });
    const rawList: any[] = (res.data as any)?.data ?? [];
    let deals = Array.isArray(rawList) ? rawList : [];

    if (deals.length === 0 && !isAdmin) {
      const byDocIdUrl =
        `${base}/api/deals?filters[manager][documentId][$eq]=${encodeURIComponent(String(managerId))}` +
        `&${sort}&${pagination}&${populate}` +
        "&fields[0]=documentId&fields[1]=dealStatus&fields[2]=dealPrice&fields[3]=downPayment&fields[4]=reserveSum&fields[5]=expiresAt&fields[6]=paymentMethod&fields[7]=createdAt";
      const res2 = await strapiAxios.get(byDocIdUrl, { headers }).catch(() => ({ data: {} }));
      const list2: any[] = (res2.data as any)?.data ?? [];
      if (Array.isArray(list2)) deals = list2;
    }

    const dealDocIdsForPayments = new Set(
      deals.map((d: any) => String(d?.documentId ?? d?.id ?? "")).filter(Boolean)
    );
    const paidSumByDeal: Record<string, number> = {};
    if (dealDocIdsForPayments.size > 0) {
      const paymentsRes = await strapiAxios
        .get(
          `${base}/api/payments?sort[0]=createdAt:desc&pagination[pageSize]=3000` +
            "&fields[0]=amount&fields[1]=paymentStatus" +
            "&populate[deal][fields][0]=documentId",
          { headers }
        )
        .catch(() => ({ data: { data: [] } }));
      const paymentsList: any[] = (paymentsRes.data as any)?.data ?? [];
      for (const p of paymentsList) {
        const dealRel = p?.deal ?? p?.attributes?.deal;
        const dealData = (dealRel as any)?.data ?? dealRel;
        const dealDocId = String(dealData?.documentId ?? dealData?.id ?? "");
        if (!dealDocId || !dealDocIdsForPayments.has(dealDocId)) continue;
        if (String(p?.paymentStatus ?? p?.attributes?.paymentStatus ?? "").trim() !== PAID_PAYMENT_STATUS)
          continue;
        const amt = Number(p?.amount ?? p?.attributes?.amount ?? 0);
        if (!Number.isFinite(amt)) continue;
        paidSumByDeal[dealDocId] = (paidSumByDeal[dealDocId] ?? 0) + amt;
      }
    }

    const now = new Date();
    const result: any[] = [];

    for (const d of deals) {
      const status = String(d?.dealStatus ?? d?.attributes?.dealStatus ?? "");
      const expiresAt = d?.expiresAt ?? d?.attributes?.expiresAt ?? null;
      const isOverdue =
        status === "Бронь" && expiresAt && new Date(expiresAt) < now;
      const effectiveStatus = isOverdue ? "Просрочен" : status;

      if (overdue && !isOverdue) continue;

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
      const projectName = entity?.project?.projectName ?? entity?.project?.attributes?.projectName ?? "";
      const apartmentNumber =
        entityType === "property"
          ? (entity?.apartmentNumber ?? "")
          : entityType === "commerce"
            ? (entity?.commerceNumber ?? "")
            : entityType === "parking"
              ? (entity?.parkingNumber ?? "")
              : (entity?.numberPantry ?? "");

      const cust = d?.customer ?? d?.attributes?.customer;
      const custData = (cust as any)?.data ?? cust;
      const name = custData?.name ?? custData?.attributes?.name ?? "";
      const surname = custData?.surname ?? custData?.attributes?.surname ?? "";
      const phone = custData?.phone ?? custData?.attributes?.phone ?? "";
      const clientName = [surname, name].filter(Boolean).join(" ").trim() || "—";

      const mgr = d?.manager ?? d?.attributes?.manager;
      const mgrData = (mgr as any)?.data ?? mgr;
      const mgrName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
      const mgrSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
      const managerDisplayName = [mgrSurname, mgrName].filter(Boolean).join(" ").trim() || "—";

      if (search) {
        const q = search.toLowerCase();
        const matchClient = clientName.toLowerCase().includes(q) || String(phone).includes(q);
        const matchApartment =
          String(apartmentNumber).toLowerCase().includes(q) ||
          projectName.toLowerCase().includes(q);
        if (!matchClient && !matchApartment) continue;
      }

      const docId = String(d?.documentId ?? d?.id ?? "");

      result.push({
        documentId: docId,
        dealStatus: effectiveStatus,
        dealPrice: d?.dealPrice ?? d?.attributes?.dealPrice ?? null,
        paidAmount: paidSumByDeal[docId] ?? 0,
        downPayment: d?.downPayment ?? d?.attributes?.downPayment ?? null,
        reserveSum: d?.reserveSum ?? d?.attributes?.reserveSum ?? null,
        expiresAt: expiresAt || null,
        paymentMethod: d?.paymentMethod ?? d?.attributes?.paymentMethod ?? null,
        createdAt: d?.createdAt ?? d?.attributes?.createdAt ?? null,
        property: {
          documentId: entity?.documentId ?? entity?.id ?? null,
          apartmentNumber,
          projectName,
          type: entityType,
          typeLabel: entityType === "commerce" ? "Коммерция" : entityType === "parking" ? "Паркинг" : entityType === "pantry" ? "Кладовка" : "Квартира",
        },
        customer: { name, surname, phone, displayName: clientName },
        manager: managerDisplayName ? { displayName: managerDisplayName } : null,
        nextPayment: null,
      });
    }

    const byStatus: Record<string, typeof result> = {};
    for (const s of DEAL_STATUS_COLUMNS) byStatus[s] = [];
    for (const deal of result) {
      const s = deal.dealStatus as string;
      if (byStatus[s]) byStatus[s].push(deal);
    }

    return NextResponse.json({
      deals: result,
      byStatus,
      columns: DEAL_STATUS_COLUMNS,
    });
  } catch (err: any) {
    console.error("[manager/deals]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
