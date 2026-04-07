import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { dealDocumentId } = body as { dealDocumentId?: string };

    if (!dealDocumentId)
      return NextResponse.json(
        { status: "error", message: "dealDocumentId required" },
        { status: 400 }
      );

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?fields[0]=dealStatus`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    const dealStatus = String(deal?.dealStatus ?? deal?.attributes?.dealStatus ?? "").trim();
    /**
     * Не блокируем отправку по статусу сделки на уровне фронта.
     * Статусы в реальном процессе могут отличаться (ДДУ/ПДБ, разные пайплайны),
     * а реальная проверка должна происходить в Strapi `signed-agreements/send-to-sign`.
     *
     * Ранее здесь была жёсткая проверка на "Ожидания договора"/"Договор подписан",
     * из-за чего документы с `requiresSigning=true` могли никогда не отправляться.
     */
    void dealStatus;

    const res = await strapiAxios.post(
      `${base}/api/signed-agreements/send-to-sign`,
      { dealDocumentId },
      { headers, timeout: 120_000 }
    );

    const data = res.data as any;

    return NextResponse.json({
      status: "ok",
      documents: data.documents ?? [],
      documentId: data.documents?.[0]?.doodocsDocumentId ?? null,
      signUrl: data.documents?.[0]?.signUrl ?? null,
    });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.message ??
      "server_error";
    if (status === 404 && msg === "no_unsigned_agreements") {
      return NextResponse.json({
        status: "ok",
        documents: [],
        documentId: null,
        signUrl: null,
        reused: true,
        message: "no_unsigned_agreements",
      });
    }
    console.error("[signing/start proxy]", status, msg);
    return NextResponse.json({ status: "error", message: msg }, { status });
  }
}
