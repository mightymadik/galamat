import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type ManagerMeResponse = {
  success?: boolean;
  data?: {
    id: string;
    branch?: {
      id: string;
    } | null;
    // Дополнительные поля могут содержать услугу менеджера (service / services)
    service?: { id?: string | null } | null;
    services?: Array<{ id?: string | null }>;
  };
};

type BranchQueueResponse = {
  waiting?: any[];
  active?: any[];
  [key: string]: unknown;
};

/**
 * GET /api/queue/manager/next-tickets
 *
 * Подтягивает очередь для текущего менеджера из queue-backend.
 * 1) Берём access_token из cookies
 * 2) Через /api/auth/manager/me узнаём branchId менеджера
 * 3) Запрашиваем /api/tickets/queue/:branchId и вытаскиваем массив ожидающих тикетов (waiting)
 */
export async function GET(_req: NextRequest) {
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
    // 1) Узнаём профиль менеджера (branchId)
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

    // Если у менеджера есть привязанные услуги — фильтруем очередь по ним (может быть несколько)
    const servicesField = meJson.data.services;
    const serviceIds =
      Array.isArray(servicesField)
        ? servicesField
            .map((s) => s?.id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];

    // 2) Тянем очередь филиала (с фильтром по одной или нескольким услугам, если они есть)
    const queueUrl = new URL(
      `/api/tickets/queue/${encodeURIComponent(branchId)}`,
      QUEUE_API_URL,
    );
    if (serviceIds.length > 0) {
      for (const id of serviceIds) {
        queueUrl.searchParams.append("serviceId", String(id));
      }
    }

    const queueRes = await fetch(queueUrl.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    });
    const queueJson = (await queueRes
      .json()
      .catch(() => ({}))) as { success?: boolean; data?: BranchQueueResponse };

    if (!queueRes.ok || !queueJson?.data) {
      return NextResponse.json(
        queueJson || { error: "queue_error" },
        { status: queueRes.status || 502 },
      );
    }

    const payload = queueJson.data;
    const rawWaiting = (payload.waiting as any[]) ?? [];

    // Иногда очередь по сокету обновляется с задержкой,
    // и в "waiting" может просочиться отмененный тикет.
    // Фильтруем строго по статусу WAITING (если он передан).
    const tickets = rawWaiting
      .filter((t: any) => {
        const status =
          (typeof t?.status === "string" ? t.status : undefined) ??
          (typeof t?.ticketStatus === "string" ? t.ticketStatus : undefined) ??
          (typeof t?.state === "string" ? t.state : undefined);

        if (!status) return true;
        return status === "WAITING";
      })
      .map((t: any) => ({
        id: String(t.id ?? t.ticketId ?? Math.random()),
        code:
          t.ticketCode ??
          t.code ??
          t.number ??
          t.queueNumber ??
          t.displayCode ??
          "",
        name:
          t.client?.fullName ??
          t.clientName ??
          t.fullName ??
          t.name ??
          t.customerName ??
          "Клиент",
      }));

    return NextResponse.json({ data: tickets }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/next-tickets]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

