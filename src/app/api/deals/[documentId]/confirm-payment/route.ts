import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

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

    const body = await request.json().catch(() => ({}));
    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    await strapiAxios.post(
      `${base}/api/deals?confirmPayment=true&dealId=${encodeURIComponent(documentId)}`,
      body,
      { headers }
    );

    return Response.json({ ok: true });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/confirm-payment]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    if (status === 400)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Некорректный запрос" },
        { status: 400 }
      );
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось сохранить условия оплаты" },
      { status: status ?? 500 }
    );
  }
}
