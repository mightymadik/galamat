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
  /** Бэкенд: не OFFLINE, но нет branchId в Redis (истёк кеш смены) */
  needsPreviousShiftClosure?: boolean;
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

/** Элемент списка окон (из GET /counters). id — documentId окна, status — available | busy */
export type CounterItem = {
  id: string;
  documentId?: string;
  code?: string;
  name?: string;
  status?: "available" | "busy";
  [key: string]: unknown;
};

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

/** Ответ создания окна в Strapi */
export type CreateCounterResponse = {
  documentId?: string;
  id?: number;
  name?: string;
  code?: string;
};

/**
 * Создать окно в Strapi (POST /api/counters). Только для admin.
 * Возвращает созданный документ (documentId — ключ для очереди).
 */
export async function createCounter(params: {
  branchId: string;
  name: string;
  number?: number;
  code?: string;
}): Promise<{ data?: CreateCounterResponse; error?: string; status: number }> {
  const res = await fetch("/api/queue/counters", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name.trim(),
      branchId: params.branchId,
      number: params.number,
      code: params.code,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: (json as { error?: string })?.error ?? "queue_error",
      status: res.status,
    };
  }
  const data = (json as { data?: CreateCounterResponse })?.data;
  return { data, status: res.status };
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
