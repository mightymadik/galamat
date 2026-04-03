import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { buildQueueCallTicketResponse } from "@/lib/buildQueueCallTicketResponse";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type ManagerMeResponse = {
  success?: boolean;
  data?: {
    id: string;
    branch?: {
      id: string;
    } | null;
  };
};

/**
 * POST /api/queue/manager/call-ticket
 *
 * Вызов конкретного талона по id (менеджер — обычный; РОП — silentBoard: true, без табло; окно/филиал — кэш смены вызывающего).
 * Body: { ticketId: string, silentBoard?: boolean }
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;

  if (!access) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenPayload = verifyAccessToken(access as string) as {
    sub?: number;
    role?: string;
  } | null;
  if (!tokenPayload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ticketId?: string;
    silentBoard?: boolean;
  };

  const ticketId = typeof body.ticketId === "string" ? body.ticketId.trim() : "";
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId_required" }, { status: 400 });
  }

  const silentBoard = body.silentBoard === true;
  if (silentBoard && tokenPayload.role !== "admin") {
    return NextResponse.json({ error: "silent_call_admin_only" }, { status: 403 });
  }

  try {
    const meRes = await fetch(`${QUEUE_API_URL}/api/auth/manager/me`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    const meJson = (await meRes.json().catch(() => ({}))) as ManagerMeResponse;

    if (!meRes.ok || !meJson?.data) {
      return NextResponse.json(
        meJson || { error: "queue_error" },
        { status: meRes.status || 502 },
      );
    }

    let branchId = meJson.data.branch?.id ?? null;

    const callBody = silentBoard ? JSON.stringify({ silentBoard: true }) : "{}";

    const callRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}/call`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: callBody,
      },
    );
    const callJson = await callRes.json().catch(() => ({}));

    if (!callRes.ok) {
      return NextResponse.json(
        callJson || { error: "queue_call_error" },
        { status: callRes.status || 502 },
      );
    }

    if (!branchId) {
      const fromTicket = (callJson as { data?: { branchId?: string } })?.data?.branchId;
      if (typeof fromTicket === "string" && fromTicket.length > 0) {
        branchId = fromTicket;
      }
    }
    if (!branchId) {
      return NextResponse.json({ error: "queue_no_branch" }, { status: 400 });
    }

    const responsePayload = await buildQueueCallTicketResponse(
      callJson,
      ticketId,
      branchId,
      access,
    );

    return NextResponse.json({ data: responsePayload }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/call-ticket]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
