import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const QUEUE_API_URL = process.env.QUEUE_API_URL || "http://localhost:3001";

/**
 * PUT /api/queue/manager/status
 * Body: { status: "AVAILABLE" | "OFFLINE" | "BREAK" | "LUNCH" }
 * Proxy to queue backend. Manager id is taken from GET /api/queue/manager/me (caller must pass managerId) or we get it from me first.
 * Alternatively the queue backend could accept status update from token (userId). For now we require body.managerId.
 */
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { status?: string; managerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const status = body?.status?.toUpperCase?.();
  if (!status || !["AVAILABLE", "OFFLINE", "BREAK", "LUNCH"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  let managerId = body.managerId;
  if (!managerId) {
    const meRes = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!meRes.ok) {
      const data = await meRes.json().catch(() => ({}));
      return NextResponse.json(data || { error: "queue_error" }, { status: meRes.status });
    }
    const meData = await meRes.json();
    managerId = meData?.data?.id;
  }
  if (!managerId) return NextResponse.json({ error: "manager_id_required" }, { status: 400 });

  try {
    const res = await fetch(`${QUEUE_API_URL}/api/managers/${encodeURIComponent(managerId)}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/manager/status]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
