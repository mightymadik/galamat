import { cookies } from "next/headers";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { createAccessToken, hashRefreshToken, createRefreshToken } from "../../../../lib/tokens";

type StrapiList<T> = { data: T[] };

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refresh = cookieStore.get("refresh_token")?.value;

    if (!refresh) {
      return Response.json({ status: "error", message: "no_refresh" }, { status: 401 });
    }

    // ✅ Strapi base normalize (без двойного /api)
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");

    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    const refreshHash = hashRefreshToken(refresh);

    const findUrl =
      `${base}/api/jwts` +
      `?filters[refreshTokenHash][$eq]=${encodeURIComponent(refreshHash)}` +
      `&filters[revokedAt][$null]=true` +
      `&filters[expiresAt][$gt]=${encodeURIComponent(nowIso)}` +
      `&populate[user][fields][0]=id&populate[user][fields][1]=documentId&populate[user][fields][2]=role` +
      `&pagination[pageSize]=1`;

    const res = await strapiAxios.get(findUrl, { headers });
    const item: any = (res.data as StrapiList<any>)?.data?.[0];

    const isSecure = process.env.NODE_ENV === "production";
    if (!item) {
      // чистим cookies чтобы не зацикливаться
      cookieStore.set("refresh_token", "", {
        httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0),
      });
      cookieStore.set("access_token", "", {
        httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0),
      });
      return Response.json({ status: "error", message: "invalid_refresh" }, { status: 401 });
    }

    // ✅ Strapi v5: поля плоские, attributes нет
    const session: any = item;
    const sessionDocId: string | null = session?.documentId || null;

    // user тоже плоский объект, как в твоём otp populate
    const userObj: any = session?.user ?? null;
    const userId: number | null = userObj?.id ?? null;
    const userDocumentId: string | undefined = userObj?.documentId ?? undefined;
    const role: string = String(userObj?.role ?? "customer");

    if (!userId || !sessionDocId) {
      cookieStore.set("refresh_token", "", {
        httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0),
      });
      cookieStore.set("access_token", "", {
        httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0),
      });
      return Response.json({ status: "error", message: "invalid_session" }, { status: 401 });
    }

    // refresh rotation
    const newRefresh = createRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefresh);
    const refreshTtlDays = 30;
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    // ✅ Strapi v5 update by documentId (НЕ id)
    await strapiAxios.put(
      `${base}/api/jwts/${sessionDocId}`,
      { data: { refreshTokenHash: newRefreshHash, expiresAt: refreshExpiresAt.toISOString() } },
      { headers }
    );

    // set new cookies (documentId для queue-backend /auth/manager/me)
    const accessToken = createAccessToken({
      sub: userId,
      role,
      documentId: userDocumentId,
    });
    const accessExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: accessExpiresAt,
    });

    cookieStore.set("refresh_token", newRefresh, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: refreshExpiresAt,
    });

    return Response.json({ status: "ok" });
  } catch (err: any) {
    console.error("REFRESH ERROR:", err?.response?.data || err?.message || err);
    return Response.json({ status: "error", message: "server_error" }, { status: 500 });
  }
}