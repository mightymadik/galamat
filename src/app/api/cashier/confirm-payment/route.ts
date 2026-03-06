import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

function ensureCashier(
  payload: { sub?: number; role?: string },
  base: string,
  headers: Record<string, string>
): Promise<{ customerDocumentId: string }> {
  let isCashier = payload.role === "cashier" || payload.role === "admin";
  return new Promise((resolve, reject) => {
    if (isCashier) {
      strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=documentId`, { headers })
        .then((res) => {
          const list = (res.data as any)?.data ?? [];
          const docId = list[0]?.documentId ?? list[0]?.id;
          resolve({ customerDocumentId: String(docId ?? payload.sub) });
        })
        .catch(() => resolve({ customerDocumentId: String(payload.sub) }));
      return;
    }
    strapiAxios
      .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role&fields[1]=documentId`, { headers })
      .then((res) => {
        const list = (res.data as any)?.data ?? [];
        const customer = list[0];
        const role = customer?.role ?? customer?.attributes?.role;
        const docId = customer?.documentId ?? customer?.id;
        if (role === "cashier" || role === "admin") {
          resolve({ customerDocumentId: String(docId ?? payload.sub) });
        } else {
          reject(new Error("forbidden"));
        }
      })
      .catch((err) => reject(err));
  });
}

/**
 * POST /api/cashier/confirm-payment
 * FormData: dealDocumentId, amount, paymentScheduleDocumentId? (optional — иначе первый с Ожидание), receipt (file)
 * Создаёт платёж, привязывает чек, помечает позицию графика «Оплачено». При переплате уменьшает сумму следующей позиции или помечает следующие как оплаченные.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const formData = await request.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "FormData required" }, { status: 400 });

    const dealDocumentId = formData.get("dealDocumentId") as string | null;
    const amountStr = formData.get("amount") as string | null;
    const paymentScheduleDocumentId = (formData.get("paymentScheduleDocumentId") as string) || null;
    const receiptFile = formData.get("receipt") as File | null;

    if (!dealDocumentId?.trim()) return NextResponse.json({ error: "dealDocumentId required" }, { status: 400 });
    const amount = amountStr ? parseInt(String(amountStr).replace(/\D/g, ""), 10) : 0;
    if (!amount || amount <= 0) return NextResponse.json({ error: "amount required and must be > 0" }, { status: 400 });

    const { customerDocumentId } = await ensureCashier(payload, base, headers);

    let receiptFileId: number | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const FormDataUpload = (await import("form-data")).default;
      const form = new FormDataUpload();
      form.append("files", Buffer.from(await receiptFile.arrayBuffer()), {
        filename: receiptFile.name || "receipt",
        contentType: receiptFile.type || "application/octet-stream",
      });
      const uploadRes = await strapiAxios.post(`${base}/api/upload`, form, {
        headers: { ...headers, ...form.getHeaders() },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const uploadData = (uploadRes.data as any) ?? [];
      const first = Array.isArray(uploadData) ? uploadData[0] : uploadData;
      if (first?.id) receiptFileId = first.id;
    }

    const now = new Date().toISOString();
    const paymentPayload: Record<string, unknown> = {
      deal: { connect: [dealDocumentId] },
      amount,
      paymentStatus: "Оплачено",
      confirmedBy: { connect: [customerDocumentId] },
      confirmedAt: now,
    };
    if (receiptFileId != null) paymentPayload.receipt = receiptFileId;

    const createRes = await strapiAxios.post(`${base}/api/payments`, { data: paymentPayload }, { headers });
    const createdPayment: any = (createRes.data as any)?.data ?? createRes.data;
    const paymentDocumentId = createdPayment?.documentId ?? createdPayment?.id;
    if (!paymentDocumentId) return NextResponse.json({ error: "payment create failed" }, { status: 502 });

    const schedulesRes = await strapiAxios.get(
      `${base}/api/payment-schedules?filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}&sort[0]=index:asc&pagination[pageSize]=100&fields[0]=documentId&fields[1]=index&fields[2]=amount&fields[3]=paymentStatus`,
      { headers }
    );
    const schedules: any[] = (schedulesRes.data as any)?.data ?? [];
    const pending = schedules.filter((s: any) => (s?.paymentStatus ?? s?.attributes?.paymentStatus) === "Ожидание");
    const targetSchedule = paymentScheduleDocumentId
      ? schedules.find((s: any) => (s?.documentId ?? s?.id) === paymentScheduleDocumentId)
      : pending[0];
    if (!targetSchedule) {
      return NextResponse.json({ error: "Нет позиции графика для оплаты (Ожидание)" }, { status: 400 });
    }

    const targetDocId = targetSchedule?.documentId ?? targetSchedule?.id;
    const targetAmount = Number(targetSchedule?.amount ?? targetSchedule?.attributes?.amount ?? 0);

    await strapiAxios.put(
      `${base}/api/payment-schedules/${targetDocId}`,
      { data: { paymentStatus: "Оплачено", payment: { connect: [paymentDocumentId] } } },
      { headers }
    );

    let remainder = amount - targetAmount;
    const targetIndex = Number(targetSchedule?.index ?? targetSchedule?.attributes?.index ?? 0);
    const nextSchedules = schedules.filter(
      (s: any) => (s?.paymentStatus ?? s?.attributes?.paymentStatus) === "Ожидание" && (Number(s?.index ?? s?.attributes?.index) > targetIndex)
    );

    for (const next of nextSchedules) {
      if (remainder <= 0) break;
      const nextAmount = Number(next?.amount ?? next?.attributes?.amount ?? 0);
      const nextDocId = next?.documentId ?? next?.id;
      if (nextAmount <= remainder) {
        await strapiAxios.put(
          `${base}/api/payment-schedules/${nextDocId}`,
          { data: { paymentStatus: "Оплачено", payment: { connect: [paymentDocumentId] } } },
          { headers }
        );
        remainder -= nextAmount;
      } else {
        await strapiAxios.put(
          `${base}/api/payment-schedules/${nextDocId}`,
          { data: { amount: nextAmount - remainder } },
          { headers }
        );
        remainder = 0;
        break;
      }
    }

    const paymentsSumRes = await strapiAxios.get(
      `${base}/api/payments?filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}&filters[paymentStatus][$eq]=Оплачено&pagination[pageSize]=500&fields[0]=amount`,
      { headers }
    );
    const paidList: any[] = (paymentsSumRes.data as any)?.data ?? [];
    const paidAmount = paidList.reduce((sum: number, p: any) => sum + Number(p?.amount ?? p?.attributes?.amount ?? 0), 0);

    const dealRes = await strapiAxios.get(`${base}/api/deals/${dealDocumentId}?fields[0]=dealPrice`, { headers });
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    const dealPrice = Number(deal?.dealPrice ?? deal?.attributes?.dealPrice ?? 0);
    const updateDealData: Record<string, unknown> = { paidAmount };
    if (dealPrice > 0 && paidAmount >= dealPrice) {
      updateDealData.dealStatus = "Оплачено";
    }
    await strapiAxios.put(`${base}/api/deals/${dealDocumentId}`, { data: updateDealData }, { headers });

    return NextResponse.json({
      status: "ok",
      paymentDocumentId,
      paidAmount,
      dealStatus: updateDealData.dealStatus ?? deal?.dealStatus ?? deal?.attributes?.dealStatus,
    });
  } catch (e: any) {
    if (e?.message === "forbidden")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[cashier/confirm-payment]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
