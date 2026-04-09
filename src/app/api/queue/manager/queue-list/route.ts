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
    status?: string;
    currentCounterId?: string | null;
    needsPreviousShiftClosure?: boolean;
    branch?: { id: string } | null;
  };
};

type BranchQueueResponse = {
  waiting?: any[];
  [key: string]: unknown;
};

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

    const queueRes = await fetch(
      `${queueApiBase}/api/tickets/queue/${encodeURIComponent(branchId)}`,
      { headers: { Authorization: `Bearer ${access}` } },
    );
    const queueJson = (await queueRes.json().catch(() => ({}))) as { data?: BranchQueueResponse };
    if (!queueRes.ok || !queueJson?.data) {
      return NextResponse.json(queueJson || { error: "queue_error" }, { status: queueRes.status || 502 });
    }

    const rawWaiting = (queueJson.data.waiting as any[]) ?? [];
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
        code: t.ticketCode ?? t.code ?? t.number ?? t.queueNumber ?? t.displayCode ?? "",
        name: t.client?.fullName ?? t.clientName ?? t.fullName ?? t.name ?? t.customerName ?? "Клиент",
      }));

    return NextResponse.json({
      data: tickets,
      debug: {
        managerStatus: meJson.data.status ?? null,
        currentCounterId: meJson.data.currentCounterId ?? null,
        needsPreviousShiftClosure: Boolean(meJson.data.needsPreviousShiftClosure),
        reason: tickets.length > 0 ? null : "queue_empty",
      },
    });
  } catch (e) {
    console.error("[queue/manager/queue-list]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
