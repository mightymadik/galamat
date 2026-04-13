import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;

  if (!access) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = verifyAccessToken(access as string);
  if (!payload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId_required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}/complete`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[queue/manager/complete-ticket]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

