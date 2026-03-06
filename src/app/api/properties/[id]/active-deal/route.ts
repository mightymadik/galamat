import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** Сделки, при которых квартиру нельзя бронировать повторно (в т.ч. «Договор подписан»). */
const ACTIVE_DEAL_STATUSES = ["Бронь", "Ожидания оплаты", "Ожидания договора", "Договор подписан"];

/**
 * GET: проверяет, есть ли по квартире активная сделка (бронь/ожидание оплаты/договора).
 * Используется для решения о доступности бронирования по статусу сделок, а не по propertyStatus.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    const tokenPayload = access ? verifyAccessToken(access) : null;

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    // Загружаем сделки по квартире без фильтра по статусу, активную выбираем в коде
    const buildUrl = (propertyFilter: string) =>
      `${base}/api/deals` +
      `?${propertyFilter}` +
      `&sort[0]=createdAt:desc` +
      `&pagination[pageSize]=25` +
      `&populate[customer][fields][0]=id`;

    const res1 = await strapiAxios.get(buildUrl(`filters[property][documentId][$eq]=${encodeURIComponent(id)}`), { headers });
    let list: any[] = (res1.data as any)?.data ?? [];
    if (!Array.isArray(list)) list = [];

    if (list.length === 0) {
      const propRes = await strapiAxios.get(
        `${base}/api/properties?filters[documentId][$eq]=${encodeURIComponent(id)}&pagination[pageSize]=1&fields[0]=id`,
        { headers }
      );
      const propList = (propRes.data as any)?.data ?? [];
      const prop = Array.isArray(propList) ? propList[0] : null;
      const propInternalId = prop?.id ?? prop?.attributes?.id ?? null;
      if (propInternalId != null) {
        const res2 = await strapiAxios.get(buildUrl(`filters[property][id][$eq]=${encodeURIComponent(propInternalId)}`), { headers });
        list = (res2.data as any)?.data ?? [];
        if (!Array.isArray(list)) list = [];
      }
    }

    const deal = list.find((d: any) => ACTIVE_DEAL_STATUSES.includes(d?.dealStatus ?? d?.attributes?.dealStatus ?? "")) ?? null;
    const hasActiveDeal = deal != null;
    const dealDocumentId = hasActiveDeal ? (deal?.documentId ?? deal?.id ?? null) : null;
    const dealCustomerId = deal?.customer?.id ?? deal?.attributes?.customer?.id ?? null;
    const canResume = Boolean(tokenPayload?.sub && dealCustomerId && Number(dealCustomerId) === Number(tokenPayload.sub));

    return NextResponse.json({
      hasActiveDeal,
      dealDocumentId: dealDocumentId ? String(dealDocumentId) : null,
      canResume: hasActiveDeal ? canResume : false,
    });
  } catch (err: any) {
    console.error("[properties/active-deal]", err?.response?.data ?? err);
    return NextResponse.json(
      { hasActiveDeal: true, canResume: false, dealDocumentId: null },
      { status: 200 }
    );
  }
}
