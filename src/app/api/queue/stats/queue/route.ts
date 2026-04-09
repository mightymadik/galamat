import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type QueueStatsBackendResponse = {
  success?: boolean;
  data?: {
    date: string;
    branchId: string;
    total: number;
    avgWaitTimeSeconds: number | null;
    avgServiceTimeSeconds: number | null;
    noShowCount?: number;
    topManagerByServed?: {
      managerId: string;
      managerName: string | null;
      ticketsServed: number;
    } | null;
    byStatus: Record<string, number>;
    bySource?: Record<string, number>;
    byService: Array<{
      serviceId: string;
      serviceName: string;
      count: number;
    }>;
  };
};

type ServiceItemRaw = {
  id?: string;
  documentId?: string;
  name?: string;
  attributes?: {
    name?: string;
  };
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return "—";
  }

  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    if (remainingSeconds > 0) {
      return `${hours} ч ${minutes} мин ${remainingSeconds} сек`;
    }
    return `${hours} ч ${minutes} мин`;
  }

  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} мин ${remainingSeconds} сек`;
    }
    return `${minutes} мин`;
  }

  return `${remainingSeconds} сек`;
}

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
  const branchId = searchParams.get("branchId") || "";
  const date = searchParams.get("date") || "";

  try {
    const url = new URL("/api/admin/stats/queue", QUEUE_API_URL);
    if (branchId) {
      url.searchParams.set("branchId", branchId);
    }
    if (date) {
      url.searchParams.set("date", date);
    }

    const servicesUrl = new URL("/api/services", QUEUE_API_URL);
    if (branchId) {
      servicesUrl.searchParams.set("branchId", branchId);
      servicesUrl.searchParams.set("isActive", "true");
    }

    const [res, servicesRes] = await Promise.all([
      fetch(url.toString(), {
        headers: { Authorization: `Bearer ${access}` },
      }),
      branchId
        ? fetch(servicesUrl.toString(), {
            headers: { Authorization: `Bearer ${access}` },
          })
        : Promise.resolve(null),
    ]);
    const json = (await res.json().catch(() => ({}))) as QueueStatsBackendResponse;

    if (!res.ok || !json?.data) {
      return NextResponse.json(json || { error: "queue_stats_error" }, { status: res.status || 502 });
    }

    const data = json.data;
    const serviceNameMap = new Map<string, string>();

    if (servicesRes?.ok) {
      const servicesJson = await servicesRes.json().catch(() => ({}));
      const list = ((servicesJson as { data?: ServiceItemRaw[] })?.data ?? []) as ServiceItemRaw[];

      for (const item of list) {
        const attrs = item.attributes ?? item;
        const id = String(item.documentId ?? item.id ?? "");
        const name = String(attrs?.name ?? "");
        if (id && name) {
          serviceNameMap.set(id, name);
        }
      }
    }

    const normalizedByService = data.byService.map((service) => ({
      ...service,
      serviceName: serviceNameMap.get(service.serviceId) || service.serviceName || service.serviceId,
    }));

    const ticketsByQr = data.bySource?.CLIENT_QR ?? 0;
    const ticketsByAdm = (data.bySource?.ADM_CREATED ?? 0) + (data.bySource?.MANAGER_CREATED ?? 0);

    const called = (data.byStatus["CALLED"] ?? 0) + (data.byStatus["SERVING"] ?? 0);
    const done = data.byStatus["DONE"] ?? 0;
    const notCalled = data.byStatus["WAITING"] ?? 0;
    const refused = (data.byStatus["CANCELLED"] ?? 0) + (data.byStatus["NO_SHOW"] ?? 0);

    const safePercent = (value: number) =>
      data.total > 0 ? `${((value / data.total) * 100).toFixed(2)}%` : "0%";

    return NextResponse.json(
      {
        stats: {
          ticketsByQr,
          ticketsByAdm,
          avgWaitInQueue: formatDuration(data.avgWaitTimeSeconds),
          avgServiceTime: formatDuration(data.avgServiceTimeSeconds),
          noShowCount: data.noShowCount ?? 0,
          topManagerByServed: data.topManagerByServed ?? null,
        },
        serviceBars: normalizedByService
          .map((service) => ({
            key: service.serviceId,
            label: service.serviceName,
            value: service.count,
          }))
          .sort((a, b) => b.value - a.value),
        statuses: [
          {
            key: "called",
            label: "Вызваны",
            count: called,
            percent: safePercent(called),
            percentColor: "text-[#2990F7]",
          },
          {
            key: "completed",
            label: "Завершены",
            count: done,
            percent: safePercent(done),
            percentColor: "text-[#009C0B]",
          },
          {
            key: "notCalled",
            label: "Не вызваны",
            count: notCalled,
            percent: safePercent(notCalled),
            percentColor: "text-[#F5A012]",
          },
          {
            key: "refused",
            label: "Отказались",
            count: refused,
            percent: safePercent(refused),
            percentColor: "text-[#DB1D31]",
          },
        ],
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[queue/stats/queue]", e);
    return NextResponse.json({ error: "queue_stats_unavailable" }, { status: 502 });
  }
}

