import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const QUEUE_API_URL = process.env.QUEUE_API_URL || "http://localhost:3001";

/**
 * GET /api/queue/manager/me
 * Proxy to queue backend: get current manager profile (status, counters, currentCounterId).
 * Requires access_token cookie; forwards as Bearer to queue backend.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
