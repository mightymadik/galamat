import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import {
  getStrapiBaseUrl,
  getStrapiHeaders,
  strapiAxios,
} from "@/lib/strapiServer";

async function ensureCashier(
  payload: { sub?: number; role?: string },
  base: string,
  headers: Record<string, string>
): Promise<string> {
  const res = await strapiAxios.get(
    `${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=documentId&fields[1]=role`,
    { headers }
  );
  const list: any[] = (res.data as any)?.data ?? [];
  const customer = list[0];
  const docId = customer?.documentId ?? customer?.id;
  // Prefer the live role from DB (token role can be stale after role changes).
  const role = String(
    customer?.role ?? customer?.attributes?.role ?? payload.role ?? ""
  )
    .trim()
    .toLowerCase();

  if (role === "cashier" || role === "admin" || role === "manager") {
    return String(docId ?? payload.sub);
  }
  throw new Error("forbidden");
}

async function uploadReceipt(
  file: File,
  base: string,
  headers: Record<string, string>
): Promise<number | null> {
  if (!file || file.size === 0) return null;
  const FormDataUpload = (await import("form-data")).default;
  const form = new FormDataUpload();
  form.append("files", Buffer.from(await file.arrayBuffer()), {
    filename: file.name || "receipt",
    contentType: file.type || "application/octet-stream",
  });
  const res = await strapiAxios.post(`${base}/api/upload`, form, {
    headers: { ...headers, ...form.getHeaders() },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const data = (res.data as any) ?? [];
  const first = Array.isArray(data) ? data[0] : data;
  return first?.id ?? null;
}

/**
 * POST /api/cashier/confirm-payment
 *
 * FormData: dealDocumentId, amount, receipt (file, опционально)
 *
 * 1. Проверяет авторизацию и роль (cashier/admin/manager)
 * 2. Загружает чек в Strapi upload
 * 3. Вызывает POST /api/payments?cashier=true → бэкенд создаёт Payment
 *    через strapi.documents(), пересчитывает paidAmount и статусы графика
 * 4. Обновляет dealStatus на фронте (на случай если бэк не сделал)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const formData = await request.formData().catch(() => null);
    if (!formData)
      return NextResponse.json({ error: "FormData required" }, { status: 400 });

    const dealDocumentId = (formData.get("dealDocumentId") as string) ?? "";
    const amountStr = (formData.get("amount") as string) ?? "";
    const receiptFile = formData.get("receipt") as File | null;

    if (!dealDocumentId.trim())
      return NextResponse.json(
        { error: "dealDocumentId required" },
        { status: 400 }
      );
    const amount = parseInt(String(amountStr).replace(/\D/g, ""), 10) || 0;
    if (amount <= 0)
      return NextResponse.json(
        { error: "amount must be > 0" },
        { status: 400 }
      );

    const customerDocumentId = await ensureCashier(payload, base, headers);

    const receiptFileId = receiptFile
      ? await uploadReceipt(receiptFile, base, headers)
      : null;

    const scheduleDocId =
      (formData.get("paymentScheduleDocumentId") as string) || null;

    const body: Record<string, unknown> = {
      dealDocumentId,
      amount,
      confirmedBy: customerDocumentId,
    };
    if (receiptFileId != null) body.receipt = receiptFileId;
    if (scheduleDocId) body.scheduleDocumentId = scheduleDocId;

    const res = await strapiAxios.post(
      `${base}/api/payments?cashier=true`,
      body,
      { headers }
    );
    const result = res.data as any;

    return NextResponse.json({
      status: "ok",
      paymentDocumentId:
        result?.data?.documentId ?? result?.data?.id ?? null,
      paidAmount: result?.paidAmount ?? 0,
    });
  } catch (e: any) {
    if (e?.message === "forbidden")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const status = e?.response?.status ?? 500;
    const msg =
      e?.response?.data?.error?.message ??
      e?.response?.data?.error ??
      e?.message ??
      "server_error";

    console.error("[cashier/confirm-payment]", {
      status,
      msg,
      url: e?.response?.config?.url,
      data: e?.response?.data,
    });

    return NextResponse.json({ error: msg }, { status });
  }
}
