import crypto from "crypto";
import { cookies, headers as nextHeaders } from "next/headers";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { isValidKzPhoneE164, normalizePhone } from "../../../../lib/authOtp";
import { createAccessToken, createRefreshToken, hashRefreshToken } from "../../../../lib/tokens";

type StrapiList<T> = { data: Array<{ id: number; attributes: T; documentId?: string }> };

function getUpdateKey(item: any): string | number {
  return item?.documentId ?? item?.attributes?.documentId ?? item?.id;
}

export async function POST(req: Request) {
  try {
    const { phone, firstName, lastName, deviceId } = await req.json().catch(() => ({}));

    if (!phone) {
      return Response.json({ status: "error", message: "phone_required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    const name = String(firstName || "").trim();
    const surname = String(lastName || "").trim();
    if (!name || !surname) {
      return Response.json({ status: "error", message: "name_surname_required" }, { status: 400 });
    }

    const base = getStrapiBaseUrl();
    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    // 1) найти customer по телефону (создан на send-code)
    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const found = await strapiAxios.get(findUrl, { headers });
    const customerItem = (found.data as any)?.data?.[0];

    if (!customerItem?.id) {
      return Response.json({ status: "error", message: "customer_not_found" }, { status: 400 });
    }

    const customerId: number = customerItem.id;
    const role: string = customerItem?.attributes?.role || "customer";

    // Enforce OTP confirmation before registration.
    const otpFindUrl =
      `${base}/api/otps` +
      `?filters[user][id][$eq]=${customerId}` +
      `&filters[confirmedAt][$null]=false` +
      `&filters[expiresAt][$gt]=${encodeURIComponent(nowIso)}` +
      `&sort=createdAt:desc` +
      `&pagination[pageSize]=1`;
    const otpRes = await strapiAxios.get(otpFindUrl, { headers });
    const otpItem: any = (otpRes.data as StrapiList<any>)?.data?.[0];
    if (!otpItem?.documentId) {
      return Response.json({ status: "error", message: "otp_not_confirmed" }, { status: 400 });
    }

    // ✅ ключ для обновления: documentId если есть, иначе id
    const updateKey = getUpdateKey(customerItem);

    await strapiAxios.put(
      `${base}/api/customers/${updateKey}`,
      {
        data: {
          name,
          surname,
          active: "active",
          // isPhoneVerified можно оставить true, если verify-code уже подтвердил телефон
          isPhoneVerified: true,
          lastLoginAt: nowIso,
        },
      },
      { headers }
    );

    const documentId = customerItem?.documentId ?? (customerItem as any)?.attributes?.documentId ?? String(customerId);

    // === Create / upsert session (jwt) + set cookies ===
    const refresh = createRefreshToken();
    const refreshHash = hashRefreshToken(refresh);
    const refreshTtlDays = 30;
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const h = await nextHeaders();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    const userAgent = h.get("user-agent") || "";

    // Strapi base: убрать возможный /api в конце
    const baseRaw = getStrapiBaseUrl();
    const baseNoApi = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");

    const jwtFindUrl =
      `${baseNoApi}/api/jwts` +
      `?filters[user][id][$eq]=${customerId}` +
      `&pagination[pageSize]=1`;

    const jwtFindRes = await strapiAxios.get(jwtFindUrl, { headers });
    const existingJwt: any = (jwtFindRes.data as StrapiList<any>)?.data?.[0];
    const existingDocId = existingJwt?.documentId ?? null;

    let sessionId: string | number | null = null;
    if (existingDocId) {
      await strapiAxios.put(
        `${baseNoApi}/api/jwts/${existingDocId}`,
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
        `${baseNoApi}/api/jwts`,
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

    const accessToken = createAccessToken({
      sub: customerId,
      role,
      documentId: String(documentId),
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
    cookieStore.set("refresh_token", refresh, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: refreshExpiresAt,
    });

    return Response.json({
      status: "ok",
      sessionId,
      user: { id: customerId, documentId, phone: normalizedPhone, role, name, surname },
    });
  } catch (err: any) {
    return Response.json(
      { status: "error", message: "server_error", error: err?.response?.data || err?.message },
      { status: 500 }
    );
  }
}