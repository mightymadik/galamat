import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** Сделки клиента: возвращает список сделок текущего пользователя с графиками платежей. */

export interface MyDealPaymentScheduleRow {
  index: number;
  dueDate: string;
  amount: number;
  paymentStatus: string;
}

export interface MyDealItem {
  documentId: string;
  dealStatus: string;
  /** Способ оплаты из сделки: "Полная оплата", "Рассрочка", "Отложенный платеж", "Ипотека" */
  paymentMethod: string | null;
  dealPrice: number | null;
  dealPricePerM2: number | null;
  downPayment: number | null;
  reserveSum: number | null;
  propertyDocumentId: string | null;
  /** Телефон менеджера сделки для ссылки «Написать в WhatsApp» */
  managerPhone: string | null;
  paymentSchedules: MyDealPaymentScheduleRow[];
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const customerId = payload.sub;
    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    let dealsList: any[] = [];
    const dealsUrlById =
      `${base}/api/deals` +
      `?filters[customer][id][$eq]=${encodeURIComponent(customerId)}` +
      `&sort[0]=createdAt:desc` +
      `&pagination[pageSize]=50` +
      `&fields[0]=documentId` +
      `&fields[1]=dealStatus` +
      `&fields[2]=dealPrice` +
      `&fields[3]=dealPricePerM2` +
      `&fields[4]=downPayment` +
      `&fields[5]=reserveSum` +
      `&fields[6]=paymentMethod` +
      `&populate[property][fields][0]=documentId` +
      `&populate[manager][fields][0]=phone`;

    const dealsRes = await strapiAxios.get(dealsUrlById, { headers });
    const rawList: any[] = (dealsRes.data as any)?.data ?? [];
    dealsList = Array.isArray(rawList) ? rawList : [];

    if (dealsList.length === 0) {
      const custRes = await strapiAxios.get(
        `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(customerId)}&pagination[pageSize]=1&fields[0]=documentId`,
        { headers }
      ).catch(() => ({ data: {} }));
      const custList = (custRes.data as any)?.data ?? [];
      const customerDocId = custList[0]?.documentId ?? custList[0]?.id ?? null;
      if (customerDocId) {
        const dealsUrlByDocId =
          `${base}/api/deals` +
          `?filters[customer][documentId][$eq]=${encodeURIComponent(String(customerDocId))}` +
          `&sort[0]=createdAt:desc` +
          `&pagination[pageSize]=50` +
          `&fields[0]=documentId` +
          `&fields[1]=dealStatus` +
          `&fields[2]=dealPrice` +
          `&fields[3]=dealPricePerM2` +
          `&fields[4]=downPayment` +
          `&fields[5]=reserveSum` +
          `&fields[6]=paymentMethod` +
          `&populate[property][fields][0]=documentId` +
          `&populate[manager][fields][0]=phone`;
        const res2 = await strapiAxios.get(dealsUrlByDocId, { headers });
        const list2: any[] = (res2.data as any)?.data ?? [];
        if (Array.isArray(list2)) dealsList = list2;
      }
    }

    const result: MyDealItem[] = [];

    for (const deal of dealsList) {
      const docId = deal?.documentId ?? deal?.id ?? null;
      if (!docId) continue;

      let propertyDocumentId: string | null = null;
      const prop = deal?.property ?? deal?.attributes?.property;
      if (prop) {
        const data = (prop as any)?.data ?? prop;
        propertyDocumentId = data?.documentId ?? data?.id ?? null;
        if (propertyDocumentId != null) propertyDocumentId = String(propertyDocumentId);
      }

      let managerPhone: string | null = null;
      const manager = deal?.manager ?? deal?.attributes?.manager;
      if (manager) {
        const mData = (manager as any)?.data ?? manager;
        const raw = mData?.phone ?? mData?.attributes?.phone ?? "";
        managerPhone = typeof raw === "string" && raw.trim() ? raw.trim() : null;
      }

      const scheduleQuery =
        `?filters[deal][documentId][$eq]=${encodeURIComponent(String(docId))}` +
        `&sort[0]=index:asc` +
        `&pagination[pageSize]=100` +
        `&fields[0]=index` +
        `&fields[1]=dueDate` +
        `&fields[2]=amount` +
        `&fields[3]=paymentStatus`;

      let paymentSchedules: MyDealPaymentScheduleRow[] = [];
      try {
        const scheduleRes = await strapiAxios.get(`${base}/api/payment-schedules${scheduleQuery}`, { headers });
        const scheduleList: any[] = (scheduleRes.data as any)?.data ?? [];
        const arr = Array.isArray(scheduleList) ? scheduleList : [];
        paymentSchedules = arr.map((row: any) => ({
          index: Number(row?.index ?? row?.attributes?.index ?? 0),
          dueDate: String(row?.dueDate ?? row?.attributes?.dueDate ?? ""),
          amount: Number(row?.amount ?? row?.attributes?.amount ?? 0),
          paymentStatus: String(row?.paymentStatus ?? row?.attributes?.paymentStatus ?? "Ожидание"),
        }));
      } catch {
        // нет графика — оставляем пустой массив
      }

      const rawPaymentMethod = deal?.paymentMethod ?? deal?.attributes?.paymentMethod ?? null;
      const paymentMethod = typeof rawPaymentMethod === "string" && rawPaymentMethod.trim() ? rawPaymentMethod.trim() : null;

      result.push({
        documentId: String(docId),
        dealStatus: String(deal?.dealStatus ?? deal?.attributes?.dealStatus ?? ""),
        paymentMethod,
        dealPrice: deal?.dealPrice ?? deal?.attributes?.dealPrice ?? null,
        dealPricePerM2: deal?.dealPricePerM2 ?? deal?.attributes?.dealPricePerM2 ?? null,
        downPayment: deal?.downPayment ?? deal?.attributes?.downPayment ?? null,
        reserveSum: deal?.reserveSum ?? deal?.attributes?.reserveSum ?? null,
        propertyDocumentId,
        managerPhone,
        paymentSchedules,
      });
    }

    return NextResponse.json({ deals: result });
  } catch (err: any) {
    console.error("[profile/my-deals]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
