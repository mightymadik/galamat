import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

/**
 * GET /api/queue/counters?branchId=xxx
 * Список всех окон филиала. branchId обязателен (можно взять из /api/queue/manager/me → branch.id).
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json(
      { error: "branchId_required", message: "branchId обязателен" },
      { status: 400 }
    );
  }

  try {
    const url = new URL(`${QUEUE_API_URL}/api/counters`);
    url.searchParams.set("branchId", branchId);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/counters]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

/**
 * POST /api/queue/counters
 * Создание окна в Strapi (api.galamat.kz). Только для роли admin.
 * Body: { name: string, branchId: string, number?: number, code?: string }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = (payload.role ?? "").toLowerCase();
  if (role !== "admin" && role !== "rop") {
    return NextResponse.json({ error: "forbidden", message: "only_admin" }, { status: 403 });
  }

  let body: { name?: string; branchId?: string; number?: number; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const name = body?.name?.trim();
  const branchId = body?.branchId;
  if (!name || !branchId) {
    return NextResponse.json(
      { error: "name_and_branchId_required" },
      { status: 400 }
    );
  }

  const number = body.number ?? 1;
  const code = body.code ?? `WINDOW_${number}`;

  try {
    const base = getStrapiBaseUrl();
    const headers = getStrapiHeaders();
    const res = await fetch(`${base}/api/counters`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: {
          name,
          number,
          code,
          description: "",
          isActive: true,
          displayOrder: 1,
          branch: branchId,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "strapi_error" }, { status: res.status });
    }
    const created = (data as { data?: { documentId?: string; id?: number; name?: string; code?: string } })?.data;
    return NextResponse.json({ success: true, data: created });
  } catch (e) {
    console.error("[queue/counters POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
