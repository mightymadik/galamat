import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const QUEUE_API_URL = process.env.QUEUE_API_URL;

/**
 * PUT /api/queue/manager/current-counter
 * Body: { counterId: string }. managerId is resolved from GET /api/queue/manager/me.
 * Proxy to queue backend: set current counter (desk) for the manager.
 */
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { counterId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const counterId = body?.counterId;
  if (!counterId || typeof counterId !== "string") {
    return NextResponse.json({ error: "counterId_required" }, { status: 400 });
  }

  let managerId: string | undefined;
  const meRes = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  if (!meRes.ok) {
    const data = await meRes.json().catch(() => ({}));
    return NextResponse.json(data || { error: "queue_error" }, { status: meRes.status });
  }
  const meData = await meRes.json();
  managerId = meData?.data?.id;
  if (!managerId) return NextResponse.json({ error: "manager_id_required" }, { status: 400 });

  try {
    const res = await fetch(`${QUEUE_API_URL}/api/auth/manager/set-counter`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ managerId, counterId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data || { error: "queue_error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[queue/manager/current-counter]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
