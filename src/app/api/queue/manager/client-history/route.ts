import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type TicketResponse = {
  success?: boolean;
  data?: {
    id?: string;
    clientId?: string;
    branchId?: string;
    client?: { id?: string };
    branch?: { id?: string };
  };
};

type HistoryItemRaw = {
  id?: string;
  createdAt?: string;
  calledAt?: string;
  closedAt?: string;
  waitTimeSeconds?: number | null;
  waitTimeMinutes?: number | null;
  serviceTimeSeconds?: number | null;
  serviceTimeMinutes?: number | null;
  managerName?: string | null;
  service?: { name?: string | null; code?: string | null } | null;
  client?: {
    fullName?: string;
    surname?: string;
    name?: string;
    middlename?: string;
    fio?: string;
    phone?: string | null;
    phoneNumber?: string | null;
  } | null;
  manager?: {
    fullName?: string;
    displayName?: string;
    name?: string;
    surname?: string;
    middlename?: string;
    fio?: string;
  } | null;
};

type HistoryResponse = {
  success?: boolean;
  data?: HistoryItemRaw[];
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
    // 1) Получаем талон, чтобы узнать clientId и branchId
    const ticketRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/${encodeURIComponent(ticketId)}`,
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const ticketJson = (await ticketRes.json().catch(() => ({}))) as TicketResponse;

    if (!ticketRes.ok || !ticketJson?.data) {
      return NextResponse.json(
        { history: [] },
        { status: 200 },
      );
    }

    const ticket = ticketJson.data;
    const clientId =
      ticket.clientId || ticket.client?.id || null;
    const branchId =
      ticket.branchId || ticket.branch?.id || null;

    if (!clientId || !branchId) {
      return NextResponse.json(
        { history: [] },
        { status: 200 },
      );
    }

    // 2) История талонов клиента по филиалу
    const historyRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/by-client/${encodeURIComponent(
        String(clientId),
      )}?branchId=${encodeURIComponent(String(branchId))}&limit=20`,
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const historyJson = (await historyRes.json().catch(() => ({}))) as HistoryResponse;

    if (!historyRes.ok || !Array.isArray(historyJson.data)) {
      return NextResponse.json(
        { history: [] },
        { status: 200 },
      );
    }

    const items = (historyJson.data || []) as HistoryItemRaw[];

    const history = items.map((h) => {
      const hClient = h.client || {};
      const hService = h.service || {};
      const hManager = h.manager || {};
      const waitSeconds =
        typeof h.waitTimeSeconds === "number"
          ? h.waitTimeSeconds
          : typeof h.waitTimeMinutes === "number"
            ? h.waitTimeMinutes
            : null;
      const serviceSeconds =
        typeof h.serviceTimeSeconds === "number"
          ? h.serviceTimeSeconds
          : typeof h.serviceTimeMinutes === "number"
            ? h.serviceTimeMinutes
            : null;
      const date: string | null =
        h.closedAt || h.calledAt || h.createdAt || null;

      const name =
        hClient.fullName ||
        [hClient.surname, hClient.name, hClient.middlename].filter(Boolean).join(" ").trim() ||
        hClient.fio ||
        "Клиент";

      const managerName =
        h.managerName ||
        hManager.fullName ||
        hManager.displayName ||
        [hManager.surname, hManager.name, hManager.middlename].filter(Boolean).join(" ").trim() ||
        hManager.fio ||
        hManager.name ||
        null;

      return {
        id: String(h.id ?? ""),
        name,
        phone: hClient.phone || hClient.phoneNumber || null,
        date,
        service: hService.name || hService.code || null,
        manager: managerName,
        waitTimeSeconds: waitSeconds,
        serviceTimeSeconds: serviceSeconds,
      };
    });

    return NextResponse.json({ history }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/client-history]", e);
    return NextResponse.json({ history: [] }, { status: 200 });
  }
}

