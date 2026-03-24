import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * POST /api/deals/[documentId]/fix-schedule
 *
 * After confirm-payment creates payment-schedule rows, this endpoint patches
 * each row with the correct amount from the frontend-computed schedule.
 *
 * Body: { paymentSchedule: { index: number; date: string; sum: string }[] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    verifyAccessToken(access);

    const { documentId } = await params;
    if (!documentId)
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const schedule: { index: number; date: string; sum: string }[] =
      Array.isArray(body?.paymentSchedule) ? body.paymentSchedule : [];

    if (!schedule.length)
      return NextResponse.json({ error: "empty schedule" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const schedRes = await strapiAxios.get(
      `${base}/api/payment-schedules?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=index:asc&pagination[pageSize]=100&fields[0]=documentId&fields[1]=index&fields[2]=amount`,
      { headers }
    );
    const rows: any[] = (schedRes.data as any)?.data ?? [];

    const updates: Promise<any>[] = [];
    for (const row of rows) {
      const docId = row?.documentId ?? row?.id;
      const rowIndex = row?.index ?? row?.attributes?.index;
      if (docId == null || rowIndex == null) continue;

      const match = schedule.find((s) => s.index === rowIndex);
      if (!match) continue;

      const amount = parseInt(String(match.sum).replace(/\D/g, ""), 10) || 0;
      updates.push(
        strapiAxios.put(
          `${base}/api/payment-schedules/${encodeURIComponent(docId)}`,
          { data: { amount } },
          { headers }
        ).catch((e) => {
          console.error(`[fix-schedule] Failed to update schedule ${docId}:`, e?.message);
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error?.message ?? err?.message;
    console.error("[deals/fix-schedule]", status ?? "error", message ?? err);
    return NextResponse.json(
      { error: message ?? "Не удалось обновить график" },
      { status: status ?? 500 }
    );
  }
}
