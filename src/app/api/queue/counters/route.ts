import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const QUEUE_API_URL = process.env.QUEUE_API_URL || "http://localhost:3001";

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
