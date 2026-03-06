import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

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
 * Query: search (ФИО/квартира), project, paymentMethod, overdue (1), onlyMine (1), excludeCancelled (1)
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
      filters.push(`filters[property][project][projectName][$eq]=${encodeURIComponent(project)}`);
    }

    if (paymentMethod) {
      filters.push(`filters[paymentMethod][$eq]=${encodeURIComponent(paymentMethod)}`);
    }

    const sort = "sort[0]=createdAt:desc";
    const pagination = "pagination[pageSize]=200";
    const populate =
      "populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber&populate[property][populate][project][fields][0]=projectName" +
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

    const now = new Date();
    const result: any[] = [];

    for (const d of deals) {
      const status = String(d?.dealStatus ?? d?.attributes?.dealStatus ?? "");
      const expiresAt = d?.expiresAt ?? d?.attributes?.expiresAt ?? null;
      const isOverdue =
        status === "Бронь" && expiresAt && new Date(expiresAt) < now;
      const effectiveStatus = isOverdue ? "Просрочен" : status;

      if (overdue && !isOverdue) continue;

      const prop = d?.property ?? d?.attributes?.property;
      const propData = (prop as any)?.data ?? prop;
      const projectName =
        propData?.project?.projectName ?? propData?.project?.attributes?.projectName ?? "";
      const apartmentNumber = propData?.apartmentNumber ?? propData?.apartmentNumber ?? "";

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
        downPayment: d?.downPayment ?? d?.attributes?.downPayment ?? null,
        reserveSum: d?.reserveSum ?? d?.attributes?.reserveSum ?? null,
        expiresAt: expiresAt || null,
        paymentMethod: d?.paymentMethod ?? d?.attributes?.paymentMethod ?? null,
        createdAt: d?.createdAt ?? d?.attributes?.createdAt ?? null,
        property: {
          documentId: propData?.documentId ?? propData?.id ?? null,
          apartmentNumber,
          projectName,
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
