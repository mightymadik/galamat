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

  const accessPayload = verifyAccessToken(access as string);
  if (!accessPayload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId_required" }, { status: 400 });
  }

  let body: {
    targetServiceId?: string;
    targetManagerId?: string;
    reason?: string;
  } = {};

  try {
    const json = await req.json().catch(() => ({}));
    body = (json || {}) as typeof body;
  } catch {
    // ignore body parse errors, use empty object
  }

  if (!body.targetServiceId) {
    return NextResponse.json({ error: "targetServiceId_required" }, { status: 400 });
  }

  const trimmedReason = typeof body.reason === "string" ? body.reason.trim() : "";
  const MAX_REASON = 2000;
  if (trimmedReason.length > MAX_REASON) {
    return NextResponse.json(
      { error: "reason_too_long", message: `Не длиннее ${MAX_REASON} символов` },
      { status: 400 },
    );
  }

  const bodyData: {
    targetServiceId: string;
    targetManagerId?: string;
    reason?: string;
  } = {
    targetServiceId: body.targetServiceId,
    targetManagerId: body.targetManagerId,
    ...(trimmedReason ? { reason: trimmedReason } : {}),
  };

  try {
    const res = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}/transfer`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      },
    );
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[queue/manager/transfer-ticket]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

