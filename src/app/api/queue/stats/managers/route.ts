import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type ManagerStatsItem = {
  managerId: string;
  managerName: string;
  managerSurname: string;
  managerFullName: string;
  ticketsServed: number;
  ticketsNoShow: number;
  avgRating: number | null;
  breakTimeSeconds?: number;
  lunchTimeSeconds?: number;
  totalServiceTimeSeconds?: number;
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

type ManagerItemRaw = {
  id?: string;
  documentId?: string;
  fullName?: string;
  name?: string;
  surname?: string;
  middlename?: string;
  attributes?: {
    fullName?: string;
    name?: string;
    surname?: string;
    middlename?: string;
  };
};

type ManagerStatsBackendResponse = {
  success?: boolean;
  data?: ManagerStatsItem[];
};

function getManagerDisplayName(item: ManagerItemRaw): string {
  const attrs = item.attributes ?? item;
  const explicitName = String(attrs?.name ?? "").trim();

  if (explicitName) {
    return explicitName;
  }

  const fullName = String(attrs?.fullName ?? "").trim();
  if (!fullName) {
    return "";
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
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
    const url = new URL("/api/admin/stats/managers", QUEUE_API_URL);
    if (branchId) {
      url.searchParams.set("branchId", branchId);
    }
    if (date) {
      url.searchParams.set("date", date);
    }

    const managersUrl = new URL("/api/managers", QUEUE_API_URL);
    if (branchId) {
      managersUrl.searchParams.set("branchId", branchId);
    }

    const [res, managersRes] = await Promise.all([
      fetch(url.toString(), {
        headers: { Authorization: `Bearer ${access}` },
      }),
      fetch(managersUrl.toString(), {
        headers: { Authorization: `Bearer ${access}` },
      }),
    ]);

    const json = (await res.json().catch(() => ({}))) as ManagerStatsBackendResponse;

    if (!res.ok || !json?.data) {
      return NextResponse.json(
        json || { error: "manager_stats_error" },
        { status: res.status || 502 },
      );
    }

    const managerNameMap = new Map<string, string>();
    if (managersRes.ok) {
      const managersJson = await managersRes.json().catch(() => ({}));
      const list = ((managersJson as { data?: ManagerItemRaw[] })?.data ?? []) as ManagerItemRaw[];

      for (const item of list) {
        const id = String(item.documentId ?? item.id ?? "");
        const displayName = getManagerDisplayName(item);
        if (id) {
          managerNameMap.set(id, displayName || id);
        }
      }
    }
    const rows = json.data.map((item) => ({
      managerId: item.managerId,
      name: item.managerName ?? managerNameMap.get(item.managerId) ?? item.managerId,
      surname: item.managerSurname ?? "",
      fullName: item.managerFullName ?? "",
      ticketsServed: item.ticketsServed,
      ticketsNoShow: item.ticketsNoShow,
      rating: item.avgRating ?? 0,
      breakTime: formatDuration(item.breakTimeSeconds ?? 0),
      lunchTime: formatDuration(item.lunchTimeSeconds ?? 0),
      serviceTimeTotal: formatDuration(item.totalServiceTimeSeconds ?? 0),
    }));

    return NextResponse.json({ rows }, { status: 200 });
  } catch (e) {
    console.error("[queue/stats/managers]", e);
    return NextResponse.json({ error: "manager_stats_unavailable" }, { status: 502 });
  }
}

