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

type BranchQueueResponse = {
  waiting?: any[];
  [key: string]: unknown;
};

/**
 * POST /api/queue/manager/call-next
 *
 * Вызывает первого клиента из очереди филиала менеджера.
 * 1) Берём access_token из cookies
 * 2) Через /api/auth/manager/me узнаём branchId менеджера
 * 3) Запрашиваем /api/tickets/queue/:branchId, берём первый waiting
 * 4) Делаем PUT /api/tickets/:id/call
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

    // 2) Очередь филиала
    const queueRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/queue/${encodeURIComponent(branchId)}`,
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const queueJson = (await queueRes
      .json()
      .catch(() => ({}))) as { success?: boolean; data?: BranchQueueResponse };

    if (!queueRes.ok || !queueJson?.data) {
      return NextResponse.json(
        queueJson || { error: "queue_error" },
        { status: queueRes.status || 502 },
      );
    }

    const payloadData = queueJson.data;
    const waiting = (payloadData.waiting as any[]) ?? [];
    // Аналогичная защита от "утекших" отмененных тикетов при гонках обновления.
    const waitingFiltered = waiting.filter((t: any) => {
      const status =
        (typeof t?.status === "string" ? t.status : undefined) ??
        (typeof t?.ticketStatus === "string" ? t.ticketStatus : undefined) ??
        (typeof t?.state === "string" ? t.state : undefined);

      if (!status) return true;
      return status === "WAITING";
    });

    const first = waitingFiltered[0];

    if (!first?.id) {
      return NextResponse.json(
        { error: "no_waiting_tickets" },
        { status: 409 },
      );
    }

    const ticketId = String(first.id);

    // 3) Вызов талона
    const callRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}/call`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const callJson = await callRes.json().catch(() => ({}));

    if (!callRes.ok) {
      return NextResponse.json(
        callJson || { error: "queue_call_error" },
        { status: callRes.status || 502 },
      );
    }

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

