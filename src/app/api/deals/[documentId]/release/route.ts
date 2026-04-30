import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** Отмена брони: если договор ещё не подписан — квартира «свободно», сделка «Отменен». Только менеджер этой сделки или админ. */
const TYPE_CONFIG = {
  property: { relation: "property", apiPath: "properties", statusField: "propertyStatus", freeValue: "свободно" },
  commerce: { relation: "commerce", apiPath: "commerces", statusField: "saleStatus", freeValue: "открыто" },
  parking: { relation: "parking", apiPath: "parkings", statusField: "saleStatus", freeValue: "открыто" },
  pantry: { relation: "pantry", apiPath: "pantrys", statusField: "saleStatus", freeValue: "открыто" },
} as const;

function resolveDealEntity(deal: any) {
  for (const key of Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>) {
    const cfg = TYPE_CONFIG[key];
    const rel = deal?.[cfg.relation] ?? deal?.attributes?.[cfg.relation];
    const id = rel?.documentId ?? rel?.id ?? rel?.data?.documentId ?? rel?.data?.id ?? null;
    if (id != null) return { cfg, documentId: String(id) };
  }
  return null;
}

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
      `${base}/api/deals/${documentId}?populate[property]=true&populate[commerce]=true&populate[parking]=true&populate[pantry]=true&populate[manager][fields][0]=id`,
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
    const doNotRelease = ["Договор подписан", "Оплачено"].includes(dealStatus);
    if (doNotRelease) {
      return Response.json({ ok: true, released: false, reason: "deal_in_progress_or_signed" });
    }

    const entity = resolveDealEntity(deal);
    if (entity?.documentId) {
      await strapiAxios.put(
        `${base}/api/${entity.cfg.apiPath}/${entity.documentId}`,
        { data: { [entity.cfg.statusField]: entity.cfg.freeValue } },
        { headers }
      );
      try {
        await strapiAxios.post(`${base}/api/${entity.cfg.apiPath}/${entity.documentId}/publish`, {}, { headers });
      } catch (_) {}
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
