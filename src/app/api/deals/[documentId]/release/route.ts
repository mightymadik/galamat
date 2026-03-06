import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** Отмена брони: если договор ещё не подписан — квартира «свободно», сделка «Отменен». Только менеджер этой сделки или админ. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?populate[property]=true&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    const isDealManager = managerId != null && Number(managerId) === Number(payload.sub);
    if (payload.role === "manager" && !isDealManager)
      return Response.json({ error: "forbidden" }, { status: 403 });

    const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
    const doNotRelease = ["Договор подписан", "Ожидания договора", "Оплачено"].includes(dealStatus);
    if (doNotRelease) {
      return Response.json({ ok: true, released: false, reason: "deal_in_progress_or_signed" });
    }

    const property = deal?.property ?? deal?.attributes?.property;
    const propertyDocId = property?.documentId ?? property?.id;
    if (propertyDocId) {
      await strapiAxios.put(
        `${base}/api/properties/${propertyDocId}`,
        { data: { propertyStatus: "свободно" } },
        { headers }
      );
    }

    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      { data: { dealStatus: "Отменен" } },
      { headers }
    );

    return Response.json({ ok: true, released: true });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/release]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось отменить бронь" },
      { status: status ?? 500 }
    );
  }
}
