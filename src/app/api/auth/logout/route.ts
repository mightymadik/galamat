import { cookies } from "next/headers";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { hashRefreshToken } from "../../../../lib/tokens";

type StrapiJwtItem = { id: number; documentId?: string; attributes?: any };
type StrapiList<T> = { data: T[] };

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refresh = cookieStore.get("refresh_token")?.value;
    const isSecure = process.env.NODE_ENV === "production";

    // чистим cookies всегда
    cookieStore.set("refresh_token", "", { httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0) });
    cookieStore.set("access_token", "", { httpOnly: true, secure: isSecure, sameSite: "lax", path: "/", expires: new Date(0) });

    if (!refresh) return Response.json({ status: "ok" });

    const base = getStrapiBaseUrl();
    const headers = getStrapiHeaders();
    const now = new Date();

    const refreshHash = hashRefreshToken(refresh);

    const findUrl =
      `${base}/api/jwts?filters[refreshTokenHash][$eq]=${encodeURIComponent(refreshHash)}&pagination[pageSize]=1`;

    const res = await strapiAxios.get(findUrl, { headers });
    const item = (res.data as StrapiList<StrapiJwtItem>)?.data?.[0];
    const jwtDocId = item?.documentId ?? item?.id;

    if (jwtDocId) {
      await strapiAxios.put(`${base}/api/jwts/${jwtDocId}`, { data: { revokedAt: now.toISOString() } }, { headers });
    }

    return Response.json({ status: "ok" });
  } catch (err: any) {
    console.error("LOGOUT ERROR:", err?.response?.data || err?.message || err);
    return Response.json({ status: "ok" });
  }
}