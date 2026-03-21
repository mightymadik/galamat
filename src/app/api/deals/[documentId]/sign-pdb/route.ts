import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** GET: проверка, подписан ли уже ПДБ по сделке (без изменений) */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ error: "unauthorized" }, { status: 401 });
    verifyAccessToken(access);

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?fields[0]=dealStatus`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });

    const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
    if (dealStatus !== "Договор подписан") {
      return Response.json({ signed: false });
    }

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1&fields[0]=signedAt`,
      { headers }
    );
    const saList = (saRes.data as any)?.data ?? [];
    const sa = saList[0];
    const signedAt = sa?.signedAt ?? sa?.attributes?.signedAt ?? null;
    return Response.json({ signed: true, signedAt });
  } catch (err: any) {
    console.error("[deals/sign-pdb GET]", err?.response?.data ?? err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST: подтверждение подписи ПДБ на месте — статус сделки «Договор подписан», квартира «договор», signed-agreement signed/signedAt */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    verifyAccessToken(access);

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?populate[property]=true`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });

    const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
    if (dealStatus === "Договор подписан") {
      const saRes = await strapiAxios.get(
        `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1`,
        { headers }
      );
      const saList = (saRes.data as any)?.data ?? [];
      const sa = saList[0];
      const signedAt = sa?.signedAt ?? sa?.attributes?.signedAt;
      return Response.json({
        ok: true,
        alreadySigned: true,
        signedAt: signedAt ?? null,
      });
    }

    const property = deal?.property ?? deal?.attributes?.property;
    const propertyDocId = property?.documentId ?? property?.id;
    if (!propertyDocId)
      return Response.json({ error: "У сделки нет квартиры" }, { status: 400 });

    const now = new Date().toISOString();

    const saListRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&pagination[pageSize]=1`,
      { headers }
    );
    const saList = (saListRes.data as any)?.data ?? [];
    const saItem = saList[0];
    const saDocId = saItem?.documentId ?? saItem?.id;

    if (saDocId) {
      await strapiAxios.put(
        `${base}/api/signed-agreements/${saDocId}`,
        { data: { signed: true, signedAt: now } },
        { headers }
      );
    }

    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      { data: { dealStatus: "Договор подписан" } },
      { headers }
    );

    await strapiAxios.put(
      `${base}/api/properties/${propertyDocId}`,
      { data: { propertyStatus: "договор" } },
      { headers }
    );

    try {
      await strapiAxios.post(
        `${base}/api/properties/${propertyDocId}/publish`,
        {},
        { headers }
      );
    } catch (publishErr: any) {
      console.warn("[deals/sign-pdb] publish property:", publishErr?.response?.status ?? publishErr?.message);
    }

    return Response.json({
      ok: true,
      signedAt: now,
    });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/sign-pdb]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось подтвердить подпись" },
      { status: status ?? 500 }
    );
  }
}
