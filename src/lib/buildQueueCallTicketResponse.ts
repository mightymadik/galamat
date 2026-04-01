/**
 * Нормализация ответа бэка после PUT /tickets/:id/call — общая для call-next и call-ticket.
 */

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

export type QueueCallTicketClientPayload = {
  success: true;
  ticketId: string;
  code: string;
  name: string;
  phone: string | null;
  waitTimeSeconds: number | null;
  branch: { id: string; name: string | null };
  service: { id: string; name: string | null; code: string | null };
  manager: { id: string; name: string | null };
  counter: { id: string; code: string | null; name: string | null };
  history: {
    id: string;
    name: string;
    phone?: string | null;
    date?: string | null;
    service?: string | null;
    waitTimeSeconds?: number | null;
    serviceTimeSeconds?: number | null;
  }[];
};

export async function buildQueueCallTicketResponse(
  callJson: unknown,
  ticketId: string,
  branchId: string,
  access: string,
): Promise<QueueCallTicketClientPayload> {
  const raw = callJson as { data?: unknown; ticket?: unknown } | null;
  const ticket =
    ((raw && (raw.data ?? raw.ticket ?? raw)) || {}) as Record<string, unknown>;

  const t = ticket as Record<string, any>;

  const client =
    t.strapiClient?.data?.attributes ||
    t.strapiClient?.attributes ||
    t.client ||
    t.customer ||
    t.user ||
    {};

  const branch =
    t.strapiBranch?.data?.attributes ||
    t.strapiBranch?.attributes ||
    t.branch ||
    {};

  const service =
    t.strapiService?.data?.attributes ||
    t.strapiService?.attributes ||
    t.service ||
    {};

  const managerRaw =
    t.strapiManager?.data?.attributes ||
    t.strapiManager?.attributes ||
    {};

  const counter =
    t.strapiCounter?.data?.attributes ||
    t.strapiCounter?.attributes ||
    t.counter ||
    {};

  const managerNameFromStrapi = [
    managerRaw.surname,
    managerRaw.name,
    managerRaw.middlename,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const clientId = t.clientId || client.id || null;

  let history: QueueCallTicketClientPayload["history"] = [];

  if (clientId) {
    const historyRes = await fetch(
      `${QUEUE_API_URL}/api/tickets/by-client/${encodeURIComponent(String(clientId))}?branchId=${encodeURIComponent(branchId)}&limit=20`,
      {
        headers: { Authorization: `Bearer ${access}` },
      },
    );
    const historyJson = await historyRes.json().catch(() => ({}));
    if (historyRes.ok && historyJson && Array.isArray((historyJson as { data?: unknown[] }).data)) {
      const items = ((historyJson as { data: unknown[] }).data || []) as Record<string, unknown>[];
      history = items.map((h) => {
        const hClient = (h.client as Record<string, unknown>) || client || {};
        const hService = (h.service as Record<string, unknown>) || {};
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
          (h.closedAt as string | undefined) ||
          (h.calledAt as string | undefined) ||
          (h.createdAt as string | undefined) ||
          null;
        return {
          id: String(h.id),
          name:
            (hClient.fullName as string) ||
            [hClient.surname, hClient.name, hClient.middlename].filter(Boolean).join(" ").trim() ||
            (hClient.fio as string) ||
            "Клиент",
          phone: (hClient.phone as string) || (hClient.phoneNumber as string) || null,
          date,
          service: (hService.name as string) || (hService.code as string) || null,
          waitTimeSeconds: waitSeconds,
          serviceTimeSeconds: serviceSeconds,
        };
      });
    }
  }

  return {
    success: true,
    ticketId: String(t.id ?? ticketId),
    code:
      t.ticketCode ||
      t.code ||
      t.number ||
      t.queueNumber ||
      t.displayCode ||
      "",
    name:
      client.fullName ||
      [client.surname, client.name, client.middlename].filter(Boolean).join(" ").trim() ||
      client.fio ||
      "Клиент",
    phone: client.phone || client.phoneNumber || null,
    waitTimeSeconds: typeof t.waitTimeSeconds === "number" ? t.waitTimeSeconds : null,
    branch: {
      id: String(t.branchId ?? branch.id ?? ""),
      name: branch.name ?? branch.title ?? null,
    },
    service: {
      id: String(t.serviceId ?? service.id ?? ""),
      name: service.name ?? null,
      code: service.code ?? null,
    },
    manager: {
      id: String(t.managerId ?? managerRaw.id ?? ""),
      name: managerNameFromStrapi || t.managerName || null,
    },
    counter: {
      id: String(t.counterId ?? counter.id ?? ""),
      code: counter.code ?? null,
      name: counter.name ?? null,
    },
    history,
  };
}
