import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL = process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "";
const QUEUE_API_CANDIDATES = QUEUE_API_URL
  ? [QUEUE_API_URL]
  : ["http://localhost:3001", "http://queue-backend:3001"];

type ManagerMeResponse = {
  success?: boolean;
  data?: { id?: string; branch?: { id: string } | null };
};

type TicketsListResponse = {
  success?: boolean;
  data?: unknown[];
};

async function fetchFirstTicket(
  queueApiBase: string,
  access: string,
  managerId: string,
  status: "CALLED" | "SERVING",
): Promise<unknown | null> {
  const qs = new URLSearchParams({
    managerId,
    status,
    limit: "1",
    page: "1",
    enrich: "true",
  });
  const res = await fetch(`${queueApiBase}/api/tickets?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const json = (await res.json().catch(() => ({}))) as TicketsListResponse;
  if (!res.ok || !Array.isArray(json.data) || json.data.length === 0) {
    return null;
  }
  return json.data[0] ?? null;
}

/**
 * Активный талон менеджера (CALLED / SERVING) — для восстановления UI, если сокет `ticket-called` не дошёл.
 */
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
        if (currentRes.ok && currentJson?.data?.id) {
          queueApiBase = baseUrl;
          meRes = currentRes;
          meJson = currentJson;
          break;
        }
        meRes = currentRes;
        meJson = currentJson;
      } catch {}
    }

    if (!meRes || !meRes.ok || !meJson?.data?.id) {
      return NextResponse.json(meJson || { error: "queue_unavailable" }, { status: meRes?.status || 503 });
    }

    const managerId = String(meJson.data.id);

    const called = await fetchFirstTicket(queueApiBase, access, managerId, "CALLED");
    const ticket = called ?? (await fetchFirstTicket(queueApiBase, access, managerId, "SERVING"));

    return NextResponse.json({ data: { ticket } }, { status: 200 });
  } catch (e) {
    console.error("[queue/manager/my-active-ticket]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
