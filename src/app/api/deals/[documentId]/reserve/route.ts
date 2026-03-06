import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/** Бронь по дням временно отключена: в интерфейсе только «Бронь на 2 часа», срок задаётся в deals/start. */
const RESERVE_OPTIONS: Record<string, { reserveSum: number; days: number }> = {
  "1day": { reserveSum: 100_000, days: 1 },
  "3days": { reserveSum: 300_000, days: 3 },
  "5days": { reserveSum: 500_000, days: 5 },
};

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
    const reserveOption = body?.reserveOption as string;
    const option = RESERVE_OPTIONS[reserveOption];
    if (!option)
      return Response.json(
        { error: "reserveOption must be 1day, 3days or 5days" },
        { status: 400 }
      );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + option.days);
    const expiresAtIso = expiresAt.toISOString();

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      {
        data: {
          reserveSum: option.reserveSum,
          expiresAt: expiresAtIso,
        },
      },
      { headers }
    );

    return Response.json({ ok: true, reserveSum: option.reserveSum, expiresAt: expiresAtIso });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/reserve]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    if (status === 400)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Некорректный запрос" },
        { status: 400 }
      );
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось обновить бронь" },
      { status: status ?? 500 }
    );
  }
}
