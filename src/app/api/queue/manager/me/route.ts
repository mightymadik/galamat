import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type StrapiList<T> = { data: T[] };

/**
 * GET /api/queue/manager/me
 * Proxy to queue backend: get current manager profile (status, counters, currentCounterId).
 * Requires access_token cookie; only manager/admin can access. Forwards as Bearer to queue backend.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Постоянное решение: роль берём из Strapi по userId (sub),
  // а не доверяем полю role внутри старого access-токена.
  try {
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const findUrl =
      `${base}/api/customers` +
      `?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}` +
      `&pagination[pageSize]=1`;

    const customerRes = await strapiAxios.get(findUrl, { headers });
    const raw: any = (customerRes.data as StrapiList<any>)?.data?.[0];

    if (!raw?.id) {
      return NextResponse.json(
        { error: "forbidden", message: "queue_only_for_managers" },
        { status: 403 }
      );
    }

    const attrs = raw?.attributes ?? raw;
    const role = String(attrs?.role ?? raw.role ?? "customer").toLowerCase();

    if (
      role !== "manager" &&
      role !== "admin" &&
      role !== "rop" &&
      role !== "external_manager" &&
      role !== "cashier" &&
      role !== "cshier"
    ) {
      console.log(
        "[queue/manager/me] 403: role from Strapi is not manager/admin/rop/external_manager/cashier, got role:",
        role
      );
      return NextResponse.json(
        { error: "forbidden", message: "queue_only_for_managers" },
        { status: 403 }
      );
    }
  } catch (e) {
    console.error("[queue/manager/me] Failed to fetch role from Strapi", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }

  try {
    const res = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/manager/me]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
