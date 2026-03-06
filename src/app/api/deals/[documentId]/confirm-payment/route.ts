import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import type { AgreementPayload, AgreementPaymentRow } from "@/types/agreement";

/** Parse "dd.mm.yyyy" to ISO date string */
function parseScheduleDate(dateStr: string): string {
  const parts = String(dateStr || "").trim().split(/[.\-/]/);
  if (parts.length < 3) return new Date().toISOString();
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (!d || !m || !y) return new Date().toISOString();
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** Parse "19 649 000 ₸" or "19649000" to number */
function parseSumToNumber(sum: string | undefined): number {
  if (sum == null) return 0;
  const digits = String(sum).replace(/\s/g, "").replace(/[^\d]/g, "");
  return parseInt(digits, 10) || 0;
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

    verifyAccessToken(access);

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const agreementPayload = body?.agreementPayload as AgreementPayload | undefined;
    if (!agreementPayload?.paymentSchedule?.length)
      return Response.json(
        { error: "agreementPayload.paymentSchedule is required" },
        { status: 400 }
      );

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealRes = await strapiAxios.get(`${base}/api/deals/${documentId}?fields[0]=reserveSum&fields[1]=id`, { headers });
    const existingDeal: any = (dealRes.data as any)?.data ?? dealRes.data;
    const reserveSum = Number(existingDeal?.reserveSum ?? existingDeal?.attributes?.reserveSum ?? 0) || 0;

    const totalSum = Number(agreementPayload.totalSum) || 0;
    const totalSumM2 = Number(agreementPayload.totalSumM2) || 0;
    const schedule = agreementPayload.paymentSchedule as AgreementPaymentRow[];
    const firstAmount = schedule.length > 0 ? parseSumToNumber(schedule[0].sum) : 0;
    const raise = body?.raise != null ? Number(body.raise) : 0;
    const firstPaymentAmount = Math.max(0, firstAmount - reserveSum);

    // 1) Update deal (сумма брони входит в стоимость; downPayment — первый платёж по графику).
    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      {
        data: {
          dealPrice: totalSum,
          dealPricePerM2: totalSumM2,
          downPayment: firstAmount,
          ...(raise >= 0 && { raise }),
        },
      },
      { headers }
    );

    const dealId = existingDeal?.id ?? existingDeal?.attributes?.id ?? null;
    const scheduleQuery = `?filters[deal][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=index:asc&pagination[pageSize]=100&populate[payment][fields][0]=documentId`;
    const scheduleRes = await strapiAxios.get(`${base}/api/payment-schedules${scheduleQuery}`, { headers }).catch(() => ({ data: {} }));
    let existingSchedules: any[] = Array.isArray((scheduleRes.data as any)?.data) ? (scheduleRes.data as any).data : [];
    if (existingSchedules.length === 0 && dealId != null) {
      const res2 = await strapiAxios.get(`${base}/api/payment-schedules?filters[deal][id][$eq]=${dealId}&sort[0]=index:asc&pagination[pageSize]=100&populate[payment][fields][0]=documentId`, { headers }).catch(() => ({ data: {} }));
      existingSchedules = Array.isArray((res2.data as any)?.data) ? (res2.data as any).data : [];
    }

    // 2) Привязываем все платежи к одному графику по сделке: обновляем существующие строки графика и платежи, при нехватке — создаём, лишние — удаляем.
    for (let i = 0; i < schedule.length; i++) {
      const row = schedule[i];
      const amount = i === 0 ? firstPaymentAmount : parseSumToNumber(row.sum);
      const dueDate = parseScheduleDate(row.date);
      const index = Number(row.index) || i + 1;
      const existingRow = existingSchedules[i];

      if (existingRow) {
        const scheduleDocId = existingRow?.documentId ?? existingRow?.id;
        const paymentDocId = existingRow?.payment?.documentId ?? existingRow?.payment?.id;
        if (scheduleDocId) {
          await strapiAxios.put(
            `${base}/api/payment-schedules/${scheduleDocId}`,
            {
              data: { index, dueDate, amount, paymentStatus: "Ожидание" },
            },
            { headers }
          );
        }
        if (paymentDocId) {
          await strapiAxios.put(
            `${base}/api/payments/${paymentDocId}`,
            { data: { amount, paymentStatus: "Ожидание" } },
            { headers }
          );
        }
      } else {
        const payRes = await strapiAxios.post(
          `${base}/api/payments`,
          {
            data: {
              deal: { connect: [documentId] },
              amount,
              paymentStatus: "Ожидание",
            },
          },
          { headers }
        );
        const payData = payRes.data?.data ?? payRes.data;
        const payDocId = payData?.documentId ?? payData?.id;
        await strapiAxios.post(
          `${base}/api/payment-schedules`,
          {
            data: {
              deal: { connect: [documentId] },
              index,
              dueDate,
              amount,
              paymentStatus: "Ожидание",
              ...(payDocId && { payment: { connect: [payDocId] } }),
            },
          },
          { headers }
        );
      }
    }

    // 3) Лишние строки графика (если новый график короче старого) — удаляем только их и привязанные платежи со статусом «Ожидание».
    for (let j = schedule.length; j < existingSchedules.length; j++) {
      const old = existingSchedules[j];
      const scheduleDocId = old?.documentId ?? old?.id;
      const paymentDocId = old?.payment?.documentId ?? old?.payment?.id;
      if (scheduleDocId) {
        try {
          await strapiAxios.delete(`${base}/api/payment-schedules/${scheduleDocId}`, { headers });
        } catch (_) {}
      }
      if (paymentDocId) {
        try {
          const payGet = await strapiAxios.get(`${base}/api/payments/${paymentDocId}?fields[0]=paymentStatus`, { headers }).catch(() => null);
          const status = (payGet?.data as any)?.data?.paymentStatus ?? (payGet?.data as any)?.paymentStatus;
          if (status === "Ожидание") {
            await strapiAxios.delete(`${base}/api/payments/${paymentDocId}`, { headers });
          }
        } catch (_) {}
      }
    }

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
