import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

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

/**
 * POST /api/deals/[documentId]/approval
 * Body: { action: "request" | "approve" | "reject" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const action = String((body as { action?: string })?.action ?? "").trim().toLowerCase();
    if (action !== "request" && action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action must be request, approve or reject" }, { status: 400 });
    }

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const rootBase = base.replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, rootBase, headers);
    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(documentId)}?populate[property]=true&populate[commerce]=true&populate[parking]=true&populate[pantry]=true`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const currentStatus = String(deal?.dealStatus ?? deal?.attributes?.dealStatus ?? "").trim();

    if (action === "request") {
      if (effectiveRole !== "manager" && effectiveRole !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const blocked = new Set(["Отменен", "Расторжение", "Договор подписан"]);
      if (blocked.has(currentStatus)) {
        return NextResponse.json({ error: `Нельзя отправить на согласование из статуса '${currentStatus}'` }, { status: 400 });
      }
      if (currentStatus === "Согласование РОП") {
        return NextResponse.json({ ok: true, status: "requested" });
      }
      await strapiAxios.put(
        `${base}/api/deals/${encodeURIComponent(documentId)}`,
        { data: { dealStatus: "Согласование РОП" } },
        { headers }
      );
      return NextResponse.json({ ok: true, status: "requested" });
    }

    if (effectiveRole !== "rop" && effectiveRole !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (currentStatus !== "Согласование РОП") {
      return NextResponse.json({ error: "Сделка не на этапе согласования РОП" }, { status: 400 });
    }

    if (action === "approve") {
      await strapiAxios.put(
        `${base}/api/deals/${encodeURIComponent(documentId)}`,
        { data: { dealStatus: "Ожидания договора" } },
        { headers }
      );
      return NextResponse.json({ ok: true, status: "approved" });
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
      } catch {
        // ignore publish errors
      }
    }

    await strapiAxios.put(
      `${base}/api/deals/${encodeURIComponent(documentId)}`,
      { data: { dealStatus: "Отменен" } },
      { headers }
    );
    return NextResponse.json({ ok: true, status: "rejected" });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? "server_error";
    console.error("[deals/approval]", status, msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
