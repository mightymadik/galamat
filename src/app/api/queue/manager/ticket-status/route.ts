import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type TicketStatusResponse = {
  success?: boolean;
  data?: {
    id?: string;
    status?: string;
    waitTimeSeconds?: number | null;
    ticketCode?: string;
    client?: { fullName?: string | null; phone?: string | null } | null;
    service?: { name?: string | null; code?: string | null } | null;
    manager?: { fullName?: string | null; name?: string | null } | null;
    counter?: { code?: string | null } | null;
    branch?: { name?: string | null } | null;
  };
};

export async function GET(req: NextRequest) {
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
    const ticketRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}`,
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );

    const ticketJson = (await ticketRes.json().catch(() => ({}))) as TicketStatusResponse;
    if (!ticketRes.ok || !ticketJson?.data) {
      return NextResponse.json(
        ticketJson || { error: "queue_ticket_unavailable" },
        { status: ticketRes.status || 502 },
      );
    }

    return NextResponse.json({ data: ticketJson.data }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/ticket-status]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
