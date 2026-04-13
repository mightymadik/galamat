import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL = process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "";
const QUEUE_API_CANDIDATES = QUEUE_API_URL
  ? [QUEUE_API_URL]
  : ["http://localhost:3001", "http://queue-backend:3001"];

type ManagerMeResponse = {
  success?: boolean;
  data?: {
    id: string;
    status?: string;
    currentCounterId?: string | null;
    needsPreviousShiftClosure?: boolean;
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

function managerServiceIdsFromMe(data: ManagerMeResponse["data"]): string[] {
  if (!data) return [];
  const fromList =
    Array.isArray(data.services) && data.services.length > 0
      ? data.services
          .map((s) => s?.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  const single =
    data.service?.id && typeof data.service.id === "string" && data.service.id.length > 0
      ? [data.service.id]
      : [];
  return [...new Set([...fromList, ...single])];
}

/**
 * GET /api/queue/manager/next-tickets
 *
 * Подтягивает очередь для текущего менеджера из queue-backend.
 * 1) Берём access_token из cookies
 * 2) Через /api/auth/manager/me узнаём branchId менеджера
 * 3) GET /api/tickets/queue/:branchId — показываем очередь для UI.
 *
 * Важно: это только отображение. Вызов "Следующий" идёт отдельно через POST /api/tickets/call-next,
 * где выбор талона происходит на backend по round-robin и не зависит от списка на экране.
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
    let queueApiBase = "";
    let meRes: Response | null = null;
    let meJson: ManagerMeResponse = {};

    // 1) Узнаём профиль менеджера (branchId)
    for (const baseUrl of QUEUE_API_CANDIDATES) {
      try {
        const currentRes = await fetch(`${baseUrl}/api/auth/manager/me`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        const currentJson = (await currentRes
          .json()
          .catch(() => ({}))) as ManagerMeResponse;

        if (currentRes.ok && currentJson?.data) {
          queueApiBase = baseUrl;
          meRes = currentRes;
          meJson = currentJson;
          break;
        }

        // Сохраняем последний ответ, чтобы вернуть полезную ошибку клиенту.
        meRes = currentRes;
        meJson = currentJson;
      } catch {
        // Пробуем следующий URL-кандидат.
      }
    }

    if (!meRes || !meRes.ok || !meJson?.data) {
      return NextResponse.json(
        meJson || { error: "queue_unavailable" },
        { status: meRes?.status || 503 },
      );
    }

    const branchId = meJson.data.branch?.id;
    if (!branchId) {
      return NextResponse.json(
        { error: "queue_no_branch" },
        { status: 400 },
      );
    }

    const queueUrl = `${queueApiBase}/api/tickets/queue/${encodeURIComponent(branchId)}`;
    const serviceIds = managerServiceIdsFromMe(meJson.data);
    const eligibleQueueUrl = new URL(queueUrl);
    for (const id of serviceIds) {
      eligibleQueueUrl.searchParams.append("serviceId", id);
    }

    const [queueRes, eligibleQueueRes, nextPreviewRes] = await Promise.all([
      fetch(queueUrl, { headers: { Authorization: `Bearer ${access}` } }),
      fetch(eligibleQueueUrl.toString(), { headers: { Authorization: `Bearer ${access}` } }),
      fetch(`${queueApiBase}/api/tickets/call-next/preview`, {
        headers: { Authorization: `Bearer ${access}` },
      }),
    ]);

    const queueJson = (await queueRes
      .json()
      .catch(() => ({}))) as { success?: boolean; data?: BranchQueueResponse };
    const eligibleQueueJson = (await eligibleQueueRes
      .json()
      .catch(() => ({}))) as { success?: boolean; data?: BranchQueueResponse };
    const nextPreviewJson = (await nextPreviewRes
      .json()
      .catch(() => ({}))) as { success?: boolean; data?: { ticketId?: string | null } };

    if (
      !queueRes.ok ||
      !queueJson?.data ||
      !eligibleQueueRes.ok ||
      !eligibleQueueJson?.data ||
      !nextPreviewRes.ok
    ) {
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
      .map((t: any, index: number) => ({
        id: String(t.id ?? t.ticketId ?? Math.random()),
        position: index + 1,
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

    const eligibleRawWaiting = (eligibleQueueJson.data.waiting as any[]) ?? [];
    const eligibleWaitingCount = eligibleRawWaiting.filter((t: any) => {
      const status =
        (typeof t?.status === "string" ? t.status : undefined) ??
        (typeof t?.ticketStatus === "string" ? t.ticketStatus : undefined) ??
        (typeof t?.state === "string" ? t.state : undefined);
      if (!status) return true;
      return status === "WAITING";
    }).length;

    const nextTicketId =
      nextPreviewJson?.data?.ticketId != null ? String(nextPreviewJson.data.ticketId) : null;
    const managerStatus = String(meJson.data.status ?? "").toUpperCase();
    const debugReason =
      eligibleWaitingCount > 0 && nextTicketId
        ? null
        : !meJson.data.branch?.id
          ? "manager_no_branch"
          : serviceIds.length === 0
            ? "manager_no_services"
          : eligibleWaitingCount > 0 && !nextTicketId
            ? "not_next_turn"
          : meJson.data.needsPreviousShiftClosure
            ? "shift_not_started_or_expired"
            : !meJson.data.currentCounterId
              ? "manager_counter_not_selected"
              : managerStatus !== "AVAILABLE"
                ? "manager_not_available"
                : "no_matching_tickets";

    return NextResponse.json(
      {
        data: tickets,
        debug: {
          managerStatus: meJson.data.status ?? null,
          currentCounterId: meJson.data.currentCounterId ?? null,
          needsPreviousShiftClosure: Boolean(meJson.data.needsPreviousShiftClosure),
          reason: debugReason,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[queue/manager/next-tickets]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

