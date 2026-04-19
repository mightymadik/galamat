import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const QUEUE_API_URL = process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "";
const QUEUE_API_CANDIDATES = QUEUE_API_URL
  ? [QUEUE_API_URL]
  : ["http://localhost:3001", "http://queue-backend:3001"];

type StrapiList<T> = { data: T[] };

type ManagerMeResponse = {
  success?: boolean;
  data?: { branch?: { id: string } | null };
};

/**
 * GET /api/queue/manager/branch-tickets
 * Список талонов филиала с фильтрами (только роли РОП и админ). Прокси к queue-backend GET /api/tickets.
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const findUrl =
      `${base}/api/customers` +
      `?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}` +
      `&pagination[pageSize]=1`;
    const customerRes = await strapiAxios.get(findUrl, { headers });
    const raw: unknown = (customerRes.data as StrapiList<Record<string, unknown>>)?.data?.[0];
    const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const attrs =
      rawObj && typeof rawObj.attributes === "object" && rawObj.attributes !== null
        ? (rawObj.attributes as Record<string, unknown>)
        : rawObj;
    const role = String(attrs?.role ?? "").toLowerCase();
    if (role !== "rop" && role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "queue_branch_tickets_admin_or_rop_only" },
        { status: 403 },
      );
    }
  } catch (e) {
    console.error("[queue/manager/branch-tickets] Strapi role check failed", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }

  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");
  const status = sp.get("status");
  const serviceId = sp.get("serviceId");
  const managerId = sp.get("managerId");
  const limit = sp.get("limit");
  const page = sp.get("page");

  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (status) qs.set("status", status);
  if (serviceId) qs.set("serviceId", serviceId);
  if (managerId) qs.set("managerId", managerId);
  qs.set("enrich", "true");
  qs.set("limit", limit && /^\d+$/.test(limit) ? limit : "50");
  qs.set("page", page && /^\d+$/.test(page) ? page : "1");

  try {
    let queueApiBase = "";
    for (const baseUrl of QUEUE_API_CANDIDATES) {
      try {
        const meRes = await fetch(`${baseUrl}/api/auth/manager/me`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        const meJson = (await meRes.json().catch(() => ({}))) as ManagerMeResponse;
        if (meRes.ok && meJson?.data) {
          queueApiBase = baseUrl;
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (!queueApiBase) {
      return NextResponse.json({ error: "queue_unavailable" }, { status: 503 });
    }

    const ticketsUrl = `${queueApiBase}/api/tickets?${qs.toString()}`;
    const ticketsRes = await fetch(ticketsUrl, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const data = await ticketsRes.json().catch(() => ({}));
    if (!ticketsRes.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: ticketsRes.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/manager/branch-tickets]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
