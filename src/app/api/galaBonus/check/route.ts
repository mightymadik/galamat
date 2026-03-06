"use server";

import axios from "axios";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";
import { normalizePhone, isValidKzPhoneE164 } from "@/lib/authOtp";

const baseUrl = () => getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
const headers = () => getStrapiHeaders();

export async function POST(req: Request) {
  try {
    const { phone } = await req.json().catch(() => ({}));

    if (!phone) {
      return Response.json({ status: "error", message: "phone_required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    const base = baseUrl();
    const h = headers();

    // 1) Find customer by phone in Strapi (api/customers)
    const customerRes = await axios.get(
      `${base}/api/customers?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}&pagination[pageSize]=1`,
      { headers: h, timeout: 10000, validateStatus: () => true }
    );

    const customerItem: any = (customerRes.data as any)?.data?.[0];
    if (!customerItem?.id) {
      return Response.json({ status: "notFound" });
    }

    const documentId =
      customerItem?.documentId ?? customerItem?.attributes?.documentId ?? String(customerItem.id);

    // 2) Get ONLY ACTIVE gala-bonuses for this user (api/gala-bonuses)
    const bonusesRes = await axios.get(
      `${base}/api/gala-bonuses?filters[user][documentId][$eq]=${encodeURIComponent(
        documentId
      )}&filters[active][$eq]=true&pagination[pageSize]=100`,
      { headers: h, timeout: 10000, validateStatus: () => true }
    );

    const list: any[] = (bonusesRes.data as any)?.data ?? [];

    let bonusSum = 0;
    let lastUpdated: string | null = null;

    for (const item of list) {
      const attrs = item?.attributes ?? item;

      // защитная проверка, даже если фильтр не сработал / поле вложено иначе
      const isActive = attrs?.active ?? item?.active;
      if (isActive !== true) continue;

      const prize = Number(attrs?.prize ?? item?.prize ?? 0) || 0;
      bonusSum += prize;

      const updated = attrs?.updatedAt ?? item?.updatedAt;
      if (updated && (!lastUpdated || updated > lastUpdated)) lastUpdated = updated;
    }

    return Response.json({
      status: "found",
      documentId,
      when: lastUpdated ?? null,
      bonus: String(bonusSum.toFixed(2)),
      balance_extra: "0.00",
    });
  } catch (err: any) {
    console.error("GALA BONUS CHECK ERROR:", err?.response?.data || err);
    return Response.json({ status: "error", error: err?.message ?? "unknown_error" }, { status: 500 });
  }
}