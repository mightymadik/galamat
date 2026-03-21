import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const PAYMENT_METHOD_MAP: Record<string, string> = {
  full: "Полная оплата",
  installment: "Рассрочка",
  deffered: "Отложенный платеж",
  hypothec: "Ипотека",
};

/** Сделки, при которых квартиру нельзя бронировать повторно */
const ACTIVE_DEAL_STATUSES = ["Бронь", "Ожидания оплаты", "Ожидания договора", "Договор подписан"];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const customerRes = await strapiAxios.get(
      `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(payload.sub)}&pagination[pageSize]=1`,
      { headers }
    );
    const customerList = (customerRes.data as any)?.data ?? [];
    const customer = Array.isArray(customerList) ? customerList[0] : null;
    if (!customer)
      return Response.json({ error: "Пользователь не найден" }, { status: 404 });
    const c = customer as Record<string, unknown>;
    const customerPhone = (c?.phone ?? (c?.attributes as any)?.phone ?? "") as string;
    const managerDocumentId = (c?.documentId ?? (c?.attributes as any)?.documentId ?? String(payload.sub)) as string;
    const role = (c?.role ?? (c?.attributes as any)?.role ?? payload?.role ?? "") as string;

    if (role !== "manager" && role !== "admin")
      return Response.json({ error: "Только менеджер или администратор могут бронировать квартиры" }, { status: 403 });
    if (!customerPhone)
      return Response.json({ error: "Телефон клиента не найден" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const propertyId = body?.propertyId;
    const paymentMethodKey = body?.paymentMethod;

    if (!propertyId || typeof propertyId !== "string")
      return Response.json(
        { error: "propertyId is required" },
        { status: 400 }
      );

    const paymentMethod = paymentMethodKey && PAYMENT_METHOD_MAP[paymentMethodKey]
      ? PAYMENT_METHOD_MAP[paymentMethodKey]
      : paymentMethodKey || "Рассрочка";

    // Idempotency: загружаем все сделки по квартире, в коде выбираем первую с активным статусом
    // (не полагаемся на фильтр dealStatus в Strapi — он может вести себя по-разному).
    const buildDealsByPropertyUrl = (propertyFilter: string) =>
      `${base}/api/deals` +
      `?${propertyFilter}` +
      `&sort[0]=createdAt:desc` +
      `&pagination[pageSize]=25` +
      `&populate[customer][fields][0]=id`;

    let dealsList: any[] = [];
    const url1 = buildDealsByPropertyUrl(`filters[property][documentId][$eq]=${encodeURIComponent(propertyId)}`);
    const res1 = await strapiAxios.get(url1, { headers });
    dealsList = (res1.data as any)?.data ?? [];
    if (!Array.isArray(dealsList)) dealsList = [];

    if (dealsList.length === 0) {
      const propRes = await strapiAxios.get(
        `${base}/api/properties?filters[documentId][$eq]=${encodeURIComponent(propertyId)}&pagination[pageSize]=1&fields[0]=id`,
        { headers }
      );
      const propList = (propRes.data as any)?.data ?? [];
      const prop = Array.isArray(propList) ? propList[0] : null;
      const propInternalId = prop?.id ?? prop?.attributes?.id ?? null;
      if (propInternalId != null) {
        const url2 = buildDealsByPropertyUrl(`filters[property][id][$eq]=${encodeURIComponent(propInternalId)}`);
        const res2 = await strapiAxios.get(url2, { headers });
        const list2 = (res2.data as any)?.data ?? [];
        if (Array.isArray(list2)) dealsList = list2;
      }
    }

    const existingActive = dealsList.find(
      (d: any) => ACTIVE_DEAL_STATUSES.includes(d?.dealStatus ?? d?.attributes?.dealStatus ?? "")
    ) ?? null;

    if (existingActive) {
      const existingDocId = existingActive?.documentId ?? existingActive?.id ?? null;
      const existingCustomerId = existingActive?.customer?.id ?? existingActive?.attributes?.customer?.id ?? null;
      if (existingCustomerId != null && Number(existingCustomerId) === Number(payload.sub)) {
        return Response.json({ reused: true, deal: existingDocId ? { documentId: String(existingDocId) } : existingActive });
      }
      return Response.json({ error: "Квартира уже забронирована" }, { status: 409 });
    }

    // Если есть сделка с неактивным статусом (Отменен, Просрочен и т.д.) — перезаписываем её вместо создания новой
    const existingInactive = dealsList.find(
      (d: any) => !ACTIVE_DEAL_STATUSES.includes(d?.dealStatus ?? d?.attributes?.dealStatus ?? "")
    ) ?? null;

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 часа
    const dealPayload = {
      dealStatus: "Бронь",
      customer: { connect: [managerDocumentId] },
      manager: { connect: [managerDocumentId] },
      paymentMethod,
      paidAmount: 0,
      expiresAt,
      ...(body?.dealPrice != null && { dealPrice: Number(body.dealPrice) }),
      ...(body?.reserveSum != null && { reserveSum: Number(body.reserveSum) }),
    };

    if (existingInactive) {
      const docId = existingInactive?.documentId ?? existingInactive?.id ?? null;
      if (docId != null) {
        await strapiAxios.put(`${base}/api/deals/${docId}`, { data: dealPayload }, { headers });
        return Response.json({ reused: true, deal: { documentId: String(docId) } });
      }
    }

    const res = await strapiAxios.post(
      `${base}/api/deals?start=true`,
      { data: { property: { connect: [propertyId] }, ...dealPayload } },
      { headers }
    );

    const deal = res.data?.data ?? res.data;
    return Response.json({ reused: false, deal });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/start]", status ?? "error", message ?? err);
    if (status === 409)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Квартира уже забронирована" },
        { status: 409 }
      );
    if (status === 400)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Некорректный запрос" },
        { status: 400 }
      );
    if (status === 403)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Доступ запрещён" },
        { status: 403 }
      );
    if (status === 404 || status === 405)
      return Response.json(
        {
          error:
            process.env.NODE_ENV === "development"
              ? `Сервер бронирования: ${status}. Убедитесь, что на бэкенде задеплоен маршрут POST /api/deals/actions/start.`
              : "Сервер бронирования временно недоступен.",
        },
        { status: 502 }
      );
    return Response.json(
      { error: process.env.NODE_ENV === "development" && message ? String(message) : "Не удалось забронировать квартиру" },
      { status: 500 }
    );
  }
}
