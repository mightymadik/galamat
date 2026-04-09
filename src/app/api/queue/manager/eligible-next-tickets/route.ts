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
    id?: string;
    status?: string;
    currentCounterId?: string | null;
    needsPreviousShiftClosure?: boolean;
    branch?: { id: string } | null;
    service?: { id?: string | null } | null;
    services?: Array<{ id?: string | null }>;
  };
};

type BranchQueueResponse = { waiting?: any[] };

function managerServiceIdsFromMe(data: ManagerMeResponse["data"]): string[] {
  if (!data) return [];
  const fromList = Array.isArray(data.services)
    ? data.services.map((s) => s?.id).filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const single =
    data.service?.id && typeof data.service.id === "string" && data.service.id.length > 0
      ? [data.service.id]
      : [];
  return [...new Set([...fromList, ...single])];
}

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!verifyAccessToken(access)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    let queueApiBase = "";
    let meRes: Response | null = null;
    let meJson: ManagerMeResponse = {};
    for (const baseUrl of QUEUE_API_CANDIDATES) {
      try {
        const currentRes = await fetch(`${baseUrl}/api/auth/manager/me`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        const currentJson = (await currentRes.json().catch(() => ({}))) as ManagerMeResponse;
        if (currentRes.ok && currentJson?.data) {
          queueApiBase = baseUrl;
          meRes = currentRes;
          meJson = currentJson;
          break;
        }
        meRes = currentRes;
        meJson = currentJson;
      } catch {}
    }
    if (!meRes || !meRes.ok || !meJson?.data) {
      return NextResponse.json(meJson || { error: "queue_unavailable" }, { status: meRes?.status || 503 });
    }

    const branchId = meJson.data.branch?.id;
    if (!branchId) return NextResponse.json({ error: "queue_no_branch" }, { status: 400 });

    const serviceIds = managerServiceIdsFromMe(meJson.data);
    const eligibleQueueUrl = new URL(
      `${queueApiBase}/api/tickets/queue/${encodeURIComponent(branchId)}`,
    );
    for (const id of serviceIds) eligibleQueueUrl.searchParams.append("serviceId", id);

    const [eligibleQueueRes, previewRes] = await Promise.all([
      fetch(eligibleQueueUrl.toString(), { headers: { Authorization: `Bearer ${access}` } }),
      fetch(`${queueApiBase}/api/tickets/call-next/preview`, { headers: { Authorization: `Bearer ${access}` } }),
    ]);
    const eligibleQueueJson = (await eligibleQueueRes.json().catch(() => ({}))) as { data?: BranchQueueResponse };
    const previewJson = (await previewRes.json().catch(() => ({}))) as {
      data?: { ticketId?: string | null };
    };
    if (!eligibleQueueRes.ok || !eligibleQueueJson?.data || !previewRes.ok) {
      return NextResponse.json({ error: "queue_error" }, { status: 502 });
    }

    const rawWaiting = (eligibleQueueJson.data.waiting as any[]) ?? [];
    const tickets = rawWaiting
      .filter((t: any) => {
        const status =
          (typeof t?.status === "string" ? t.status : undefined) ??
          (typeof t?.ticketStatus === "string" ? t.ticketStatus : undefined) ??
          (typeof t?.state === "string" ? t.state : undefined);
        if (!status) return true;
        return status === "WAITING";
      })
      .map((t: any) => ({ id: String(t.id ?? t.ticketId ?? ""), code: t.ticketCode ?? t.code ?? "" }))
      .filter((t: any) => t.id);

    const nextTicketId = previewJson?.data?.ticketId ? String(previewJson.data.ticketId) : null;
    const managerStatus = String(meJson.data.status ?? "").toUpperCase();
    const reason =
      tickets.length > 0 && nextTicketId
        ? null
        : serviceIds.length === 0
          ? "manager_no_services"
          : tickets.length > 0 && !nextTicketId
            ? "not_next_turn"
            : managerStatus !== "AVAILABLE"
              ? "manager_not_available"
              : !meJson.data.currentCounterId
                ? "manager_counter_not_selected"
                : meJson.data.needsPreviousShiftClosure
                  ? "shift_not_started_or_expired"
                  : "no_matching_tickets";

    return NextResponse.json({
      data: tickets,
      debug: { reason, nextTicketId },
    });
  } catch (e) {
    console.error("[queue/manager/eligible-next-tickets]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
