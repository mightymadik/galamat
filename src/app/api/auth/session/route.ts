import { cookies, headers as nextHeaders } from "next/headers";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { isValidKzPhoneE164, normalizePhone } from "../../../../lib/authOtp";
import { createAccessToken, createRefreshToken, hashRefreshToken } from "../../../../lib/tokens";

type StrapiList<T> = { data: T[] };

/**
 * POST /api/auth/session
 * Creates auth session (jwt + cookies) AFTER phone is confirmed (verify-code confirmOnly)
 * and AFTER profile is complete (name/surname), or after registration.
 */
export async function POST(req: Request) {
  try {
    const { phone, deviceId } = await req.json().catch(() => ({}));
    if (!phone) {
      return Response.json({ status: "error", message: "phone_required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    // Strapi base: убрать возможный /api
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    // 1) Find customer
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
    const attrs = customerItem?.attributes ?? customerItem;
    const role = String(customerItem.role || "customer");

    const name = String(attrs?.name ?? "").trim();
    const surname = String(attrs?.surname ?? "").trim();
    if (!name || !surname) {
      return Response.json({ status: "error", message: "name_surname_required" }, { status: 400 });
    }

    // 2) Ensure there is a recently confirmed OTP that hasn't expired yet
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

    // 3) Activate customer + lastLoginAt
    await strapiAxios.put(
      `${base}/api/customers/${customerDocId}`,
      { data: { active: "active", lastLoginAt: new Date().toISOString() } },
      { headers }
    );

    // 4) Upsert session (jwts)
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

    // 5) Cookies
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
      user: {
        id: customerId,
        documentId: customerDocId,
        phone: normalizedPhone,
        role,
        name,
        surname,
      },
    });
  } catch (err: any) {
    return Response.json(
      { status: "error", message: "server_error", error: err?.response?.data || err?.message },
      { status: 500 }
    );
  }
}

