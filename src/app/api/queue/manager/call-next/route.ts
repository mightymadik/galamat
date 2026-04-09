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
 * POST /api/queue/manager/call-next
 *
 * Вызывает следующего клиента по round-robin на бэкенде.
 * 1) Берём access_token из cookies
 * 2) Через /api/auth/manager/me узнаём branchId менеджера
 * 3) POST /api/tickets/call-next — бэк выбирает талон по round-robin и вызывает его
 */
export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;

  if (!access) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = verifyAccessToken(access as string);
  if (!payload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // 1) Профиль менеджера → branchId
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

    const branchId = meJson.data.branch?.id;
    if (!branchId) {
      return NextResponse.json(
        { error: "queue_no_branch" },
        { status: 400 },
      );
    }

    const callRes = await fetch(`${QUEUE_API_URL}/api/tickets/call-next`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
    });
    const callJson = await callRes.json().catch(() => ({}));

    if (!callRes.ok) {
      return NextResponse.json(
        callJson || { error: "queue_call_error" },
        { status: callRes.status || 502 },
      );
    }

    const called = (callJson as { data?: { id?: string } }).data;
    const ticketId = called?.id ? String(called.id) : "";

    const responsePayload = await buildQueueCallTicketResponse(
      callJson,
      ticketId,
      branchId,
      access,
    );

    return NextResponse.json({ data: responsePayload }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/call-next]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

