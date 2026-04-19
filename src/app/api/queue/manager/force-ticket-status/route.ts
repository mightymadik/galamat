import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type StrapiList<T> = { data: T[] };

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
        { error: "forbidden", message: "queue_force_status_admin_or_rop_only" },
        { status: 403 },
      );
    }
  } catch (e) {
    console.error("[queue/manager/force-ticket-status] Strapi role check failed", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }

  const body = (await req.json().catch(() => ({}))) as { ticketId?: string; status?: string };
  const ticketId = String(body.ticketId ?? "").trim();
  const status = String(body.status ?? "").trim().toUpperCase();
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId_required" }, { status: 400 });
  }
  if (!["DONE", "CANCELLED", "NO_SHOW"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const queueRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}/force-status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );
    const json = await queueRes.json().catch(() => ({}));
    if (!queueRes.ok) {
      return NextResponse.json(json || { error: "queue_error" }, { status: queueRes.status });
    }
    return NextResponse.json(json, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/force-ticket-status]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
