/**
 * Queue backend (galamat-queue-backend) API — manager profile, status, current counter.
 * All requests go via Next.js API routes and use cookies (credentials: "include").
 */

export type ManagerProfile = {
  id: string;
  status: string;
  branch: { id: string } | null;
  counters: Array<{ id: string; code: string }>;
  currentCounterId: string | null;
};

export type BackendStatus = "AVAILABLE" | "OFFLINE" | "BREAK" | "LUNCH";

const BASE = "/api/queue/manager";

type QueueFetchOptions = Omit<RequestInit, "body"> & { body?: object };

async function queueFetch<T>(
  url: string,
  options?: QueueFetchOptions
): Promise<{ data?: T; error?: string; status: number }> {
  const { body, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers as HeadersInit),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data as { error?: string })?.error ?? "queue_error", status: res.status };
  }
  return { data: data as T, status: res.status };
}

export async function getManagerProfile(): Promise<{
  data?: ManagerProfile;
  error?: string;
  status: number;
}> {
  return queueFetch<{ success: boolean; data: ManagerProfile }>(`${BASE}/me`).then((r) => {
    if (r.data?.data) return { data: r.data.data, status: r.status ?? 200 };
    return { error: r.error, status: r.status ?? 500 };
  });
}

export async function setManagerStatus(status: BackendStatus): Promise<{
  ok: boolean;
  error?: string;
  status: number;
}> {
  const r = await queueFetch<{ success?: boolean }>(`${BASE}/status`, {
    method: "PUT",
    body: { status },
  });
  return {
    ok: r.status >= 200 && r.status < 300,
    error: r.error,
    status: r.status ?? 500,
  };
}

export async function setManagerCurrentCounter(counterId: string): Promise<{
  ok: boolean;
  error?: string;
  status: number;
}> {
  const r = await queueFetch<{ success?: boolean }>(`${BASE}/current-counter`, {
    method: "PUT",
    body: { counterId },
  });
  return {
    ok: r.status >= 200 && r.status < 300,
    error: r.error,
    status: r.status ?? 500,
  };
}

/** Элемент списка окон (из GET /counters) */
export type CounterItem = { id: string; code?: string; [key: string]: unknown };

/**
 * Список всех окон филиала. branchId обязателен (из /auth/manager/me → branch.id).
 */
export async function getCounters(branchId: string): Promise<{
  data?: CounterItem[];
  error?: string;
  status: number;
}> {
  const res = await fetch(`/api/queue/counters?branchId=${encodeURIComponent(branchId)}`, {
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: (json as { error?: string })?.error ?? "queue_error",
      status: res.status,
    };
  }
  const list = (json as { data?: CounterItem[] })?.data ?? [];
  return { data: list, status: res.status };
}

/** Map UI status to backend enum */
export function toBackendStatus(
  status: "available" | "break" | "lunch" | "unavailable"
): BackendStatus {
  const map: Record<string, BackendStatus> = {
    available: "AVAILABLE",
    unavailable: "OFFLINE",
    break: "BREAK",
    lunch: "LUNCH",
  };
  return map[status] ?? "OFFLINE";
}
