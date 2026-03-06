import crypto from "crypto";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { hashOtp, isValidKzPhoneE164, normalizePhone } from "../../../../lib/authOtp";

type StrapiList<T> = { data: T[] };

function safeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Проверка кода подтверждения номера для Гала бонуса (без входа в аккаунт). */
export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json().catch(() => ({}));

    if (!phone || !code) {
      return Response.json({ status: "error", message: "phone and code are required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    const codeStr = String(code);
    if (!/^\d{4}$/.test(codeStr)) {
      return Response.json({ status: "error", message: "invalid_code_format" }, { status: 400 });
    }

    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    const customerFindUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const customerRes = await strapiAxios.get(customerFindUrl, { headers });
    const customerItem: any = (customerRes.data as StrapiList<any>)?.data?.[0];

    if (!customerItem?.id) {
      return Response.json({ status: "error", message: "customer_not_found" }, { status: 400 });
    }

    const customerId: number = customerItem.id;

    const otpFindUrl =
      `${base}/api/otps` +
      `?filters[user][id][$eq]=${customerId}` +
      `&filters[confirmedAt][$null]=true` +
      `&filters[expiresAt][$gt]=${encodeURIComponent(nowIso)}` +
      `&sort=createdAt:desc` +
      `&pagination[pageSize]=1`;

    const otpRes = await strapiAxios.get(otpFindUrl, { headers });
    const otpItem: any = (otpRes.data as StrapiList<any>)?.data?.[0];

    if (!otpItem?.documentId) {
      return Response.json({ status: "error", message: "code_expired_or_not_found" }, { status: 400 });
    }

    const otpDocId: string = otpItem.documentId;
    const attemptsLeft: number = Number(otpItem.attemptsLeft ?? 0);

    if (attemptsLeft <= 0) {
      return Response.json({ status: "error", message: "too_many_attempts" }, { status: 429 });
    }

    const incomingHash = hashOtp(codeStr);
    const storedHash = String(otpItem.codeHash || "");
    const match = safeEqualHex(incomingHash, storedHash);

    if (!match) {
      const left = Math.max(0, attemptsLeft - 1);
      await strapiAxios.put(
        `${base}/api/otps/${otpDocId}`,
        { data: { attemptsLeft: left } },
        { headers }
      );
      return Response.json(
        { status: "error", message: "invalid_code", meta: { attemptsLeft: left } },
        { status: 400 }
      );
    }

    await strapiAxios.put(
      `${base}/api/otps/${otpDocId}`,
      { data: { confirmedAt: new Date().toISOString() } },
      { headers }
    );

    return Response.json({ status: "ok", phone: normalizedPhone });
  } catch (err: any) {
    const details = err?.response?.data || err?.message || String(err);
    console.error("GALA-BONUS VERIFY-PHONE ERROR:", details);
    return Response.json({ status: "error", message: "server_error", error: details }, { status: 500 });
  }
}
