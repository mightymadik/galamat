import crypto from "crypto";
import { cookies, headers as nextHeaders } from "next/headers";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { hashOtp, isValidKzPhoneE164, normalizePhone } from "../../../../lib/authOtp";
import { createAccessToken, createRefreshToken, hashRefreshToken } from "../../../../lib/tokens";

type StrapiList<T> = { data: T[] };

function safeEqualHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const { phone, code, deviceId, confirmOnly } = await req.json().catch(() => ({}));

    if (!phone || !code) {
      return Response.json({ status: "error", message: "phone and code are required" }, { status: 400 });
    }

    const onlyConfirm = confirmOnly === true || confirmOnly === "true";

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    const codeStr = String(code);
    if (!/^\d{4}$/.test(codeStr)) {
      return Response.json({ status: "error", message: "invalid_code_format" }, { status: 400 });
    }

    // ⚠️ Strapi base: убедимся что нет двойного /api
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");

    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    // 1) customer по phone
    const customerFindUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const customerRes = await strapiAxios.get(customerFindUrl, { headers });
    const customerItem: any = (customerRes.data as StrapiList<any>)?.data?.[0];

    if (!customerItem?.id || !customerItem?.documentId) {
      return Response.json({ status: "error", message: "customer_not_found" }, { status: 400 });
    }

    const customerId: number = customerItem.id;
    const customerDocId: string = customerItem.documentId;

    // 2) OTP по user.id (у тебя user — объект с id/documentId)
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

    // attemptsLeft / codeHash лежат прямо в otpItem
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

    // 3) confirmedAt (✅ по documentId!)
    await strapiAxios.put(
      `${base}/api/otps/${otpDocId}`,
      { data: { confirmedAt: new Date().toISOString() } },
      { headers }
    );

    if (onlyConfirm) {
      return Response.json({ status: "ok" });
    }

    // 4) update customer (✅ по documentId!)
    await strapiAxios.put(
      `${base}/api/customers/${customerDocId}`,
      {
        data: {
          isPhoneVerified: true,
          active: "active",
          lastLoginAt: new Date().toISOString(),
        },
      },
      { headers }
    );

    // 5) одна сессия на пользователя — найти существующую и перезаписать или создать
    const refresh = createRefreshToken();
    const refreshHash = hashRefreshToken(refresh);

    const refreshTtlDays = 30;
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const h = await nextHeaders();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    const userAgent = h.get("user-agent") || "";

    const jwtFindUrl =
      `${base}/api/jwts` +
      `?filters[user][id][$eq]=${customerId}` +
      `&pagination[pageSize]=1`;

    const jwtFindRes = await strapiAxios.get(jwtFindUrl, { headers });
    const existingJwt: any = (jwtFindRes.data as StrapiList<any>)?.data?.[0];
    const existingDocId = existingJwt?.documentId ?? null;

    let sessionId: string | number | null = null;

    if (existingDocId) {
      await strapiAxios.put(
        `${base}/api/jwts/${existingDocId}`,
        {
          data: {
            refreshTokenHash: refreshHash,
            expiresAt: refreshExpiresAt.toISOString(),
            revokedAt: null,
            deviceId: deviceId || null,
            ip: ip || null,
            userAgent: userAgent || null,
          },
        },
        { headers }
      );
      sessionId = existingJwt?.id ?? existingDocId;
    } else {
      const jwtCreateRes = await strapiAxios.post(
        `${base}/api/jwts`,
        {
          data: {
            user: customerId,
            refreshTokenHash: refreshHash,
            expiresAt: refreshExpiresAt.toISOString(),
            revokedAt: null,
            deviceId: deviceId || null,
            ip: ip || null,
            userAgent: userAgent || null,
          },
        },
        { headers }
      );
      sessionId = jwtCreateRes.data?.data?.id ?? jwtCreateRes.data?.data?.documentId ?? null;
    }

    // 6) access token cookie (7 days). documentId нужен для queue-backend (GET /auth/manager/me)
    const role = String(customerItem.role || "customer");
    const accessToken = createAccessToken({
      sub: customerId,
      role,
      documentId: customerDocId,
    });
    const accessExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const cookieStore = await cookies();

    const isSecure = process.env.NODE_ENV === "production";
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: accessExpiresAt,
    });

    // 7) refresh cookie (30 дней)
    cookieStore.set("refresh_token", refresh, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: refreshExpiresAt,
    });

    const attrs = customerItem?.attributes ?? customerItem;
    const documentId = customerItem?.documentId ?? attrs?.documentId ?? String(customerId);
    return Response.json({
      status: "ok",
      sessionId,
      user: {
        id: customerId,
        documentId,
        phone: normalizedPhone,
        role,
        name: attrs?.name ?? undefined,
        surname: attrs?.surname ?? undefined,
      },
    });
  } catch (err: any) {
    const details = err?.response?.data || err?.message || String(err);
    console.error("VERIFY-CODE ERROR:", details);
    return Response.json({ status: "error", message: "server_error", error: details }, { status: 500 });
  }
}