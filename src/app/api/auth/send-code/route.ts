import axios from "axios";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { hashOtp, isValidKzPhoneE164, normalizePhone, rand4 } from "../../../../lib/authOtp";

const OTP_TTL_SEC = 180;
const RESEND_COOLDOWN_SEC = 30;
const MAX_SENT_COUNT = 10;
const SENT_COUNT_WINDOW_SEC = 24 * 60 * 60;

type StrapiList<T> = { data: Array<{ id: number; attributes: T }> };

export async function POST(req: Request) {
  try {
    const { phone } = await req.json().catch(() => ({}));
    if (!phone) {
      return Response.json({ status: "error", message: "phone is required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    if (!process.env.WASENDER_API_KEY) {
      return Response.json({ status: "error", message: "WASENDER_API_KEY missing" }, { status: 500 });
    }

    const base = getStrapiBaseUrl();
    const headers = getStrapiHeaders();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_SEC * 1000);
    const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_SEC * 1000);

    // 1) customer существует?
    const customerFindUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const customerRes = await strapiAxios.get(customerFindUrl, { headers });
    const customer = (customerRes.data as any)?.data?.[0];
    let customerId = customer?.id ?? null;

    // 2) если customer нет — создаём (чтобы было к кому привязать OTP)
    if (!customerId) {
      const created = await strapiAxios.post(
        `${base}/api/customers`,
        {
          data: {
            phone: normalizedPhone,
            role: "customer",
            active: "pending",     // или "active"
            isPhoneVerified: false,
          },
        },
        { headers }
      );

      customerId = created.data?.data?.id ?? null;
      if (!customerId) throw new Error("Failed to create customer for otp");
    }

    // 3) найти один OTP по user (любой — перезаписываем, один OTP на пользователя)
    const otpFindUrl =
      `${base}/api/otps` +
      `?filters[user][id][$eq]=${customerId}` +
      `&sort=createdAt:desc` +
      `&pagination[pageSize]=1`;

    const otpRes = await strapiAxios.get(otpFindUrl, { headers });
    const otpItem = (otpRes.data as any)?.data?.[0];
    const otpDocId = otpItem?.documentId ?? null;
    const otpAttrs = otpItem?.attributes ?? otpItem;

    // Enforce resend cooldown on server side.
    const resendAtRaw = otpAttrs?.resendAvailableAt;
    if (resendAtRaw) {
      const resendAtTs = Date.parse(String(resendAtRaw));
      if (!Number.isNaN(resendAtTs) && resendAtTs > now.getTime()) {
        const retryAfterSec = Math.max(1, Math.ceil((resendAtTs - now.getTime()) / 1000));
        return Response.json(
          {
            status: "error",
            message: "otp_resend_cooldown",
            meta: { retryAfterSec, resendCooldownSec: RESEND_COOLDOWN_SEC },
          },
          { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
        );
      }
    }

    const createdAtRaw = otpItem?.createdAt ?? otpAttrs?.createdAt;
    const createdAtTs = createdAtRaw ? Date.parse(String(createdAtRaw)) : NaN;
    const isWithinSentCountWindow =
      !Number.isNaN(createdAtTs) &&
      now.getTime() - createdAtTs < SENT_COUNT_WINDOW_SEC * 1000;
    const baseSentCount = isWithinSentCountWindow ? Number(otpAttrs?.sentCount ?? 0) : 0;
    const nextSentCount = baseSentCount + 1;

    if (nextSentCount > MAX_SENT_COUNT) {
      const retryAfterSec = !Number.isNaN(createdAtTs)
        ? Math.max(1, Math.ceil((createdAtTs + SENT_COUNT_WINDOW_SEC * 1000 - now.getTime()) / 1000))
        : SENT_COUNT_WINDOW_SEC;
      return Response.json(
        {
          status: "error",
          message: "otp_send_limit_reached",
          meta: { maxSentCount: MAX_SENT_COUNT, retryAfterSec },
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    // 3) генерим код и hash
    const code = rand4();
    const codeHash = hashOtp(code);

    // 4) upsert otp — один на пользователя, перезаписываем
    if (otpDocId) {
      await strapiAxios.put(`${base}/api/otps/${otpDocId}`, {
        data: {
          user: customerId,
          codeHash,
          expiresAt: expiresAt.toISOString(),
          attemptsLeft: 5,
          resendAvailableAt: resendAvailableAt.toISOString(),
          sentCount: nextSentCount,
          confirmedAt: null,
        },
      }, { headers });
    } else {
      await strapiAxios.post(`${base}/api/otps`, {
        data: {
          user: customerId,
          codeHash,
          expiresAt: expiresAt.toISOString(),
          attemptsLeft: 5,
          resendAvailableAt: resendAvailableAt.toISOString(),
          sentCount: 1,
          confirmedAt: null,
        },
      }, { headers });
    }

    // 5) отправляем в WhatsApp
    const waBody = {
      to: normalizedPhone,
      content: {
        whatsappContent: {
          contentType: "AUTHENTICATION",
          name: "authorization",
          code,
        },
      },
    };

    await axios.post("https://kazinfoteh.org/wasender/sendwamsg", waBody, {
      headers: {
        "X-API-KEY": process.env.WASENDER_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    return Response.json({
      status: "ok",
      meta: {
        expiresInSec: OTP_TTL_SEC,
        resendCooldownSec: RESEND_COOLDOWN_SEC,
      },
      ...(process.env.NODE_ENV !== "production" ? { dev: { code } } : {}),
    });
  } catch (err: any) {
    const details = err?.response?.data || err?.message || String(err);
    console.error("SEND-CODE ERROR:", details);
    return Response.json({ status: "error", message: "Не удалось отправить код", error: details }, { status: 500 });
  }
}