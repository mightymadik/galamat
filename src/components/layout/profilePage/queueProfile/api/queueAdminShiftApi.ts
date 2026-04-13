/**
 * Смена филиала (admin): прокси Next.js → queue-backend /api/admin/...
 */

import { extractQueueApiErrorMessage } from "./queueApiError";

export type OnlineManagerBlockingClose = {
  id: string;
  name: string | null;
  status: string;
};

export async function fetchCurrentBranchShift(branchId: string): Promise<{
  shiftId: string | null;
  status: number;
  error?: string;
}> {
  const res = await fetch(
    `/api/queue/admin/shifts/current?branchId=${encodeURIComponent(branchId)}`,
    { credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id?: string } | null;
    error?: string;
  };
  if (!res.ok) {
    const msg = extractQueueApiErrorMessage(json);
    return {
      shiftId: null,
      status: res.status,
      error: msg ?? json.error ?? "queue_error",
    };
  }
  const id = json.data?.id;
  return { shiftId: id ? String(id) : null, status: res.status };
}

export async function openBranchShift(branchId: string): Promise<{
  ok: boolean;
  status: number;
  shiftId?: string;
  error?: string;
  message?: string;
}> {
  const res = await fetch("/api/queue/admin/shifts/open", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id?: string };
    error?: string;
    message?: string;
  };
  const shiftId = json.data?.id ? String(json.data.id) : undefined;
  const ok = res.ok && json.success !== false;
  return {
    ok,
    status: res.status,
    shiftId,
    error: ok ? undefined : extractQueueApiErrorMessage(json) ?? json.error,
    message: json.message,
  };
}

export type CloseBranchShiftResult =
  | { kind: "closed" }
  | { kind: "unfinished" }
  | { kind: "onlineManagers"; managers: OnlineManagerBlockingClose[] }
  | { kind: "error"; status: number; error?: string };

export async function closeBranchShift(shiftId: string): Promise<CloseBranchShiftResult> {
  const res = await fetch(
    `/api/queue/admin/shifts/${encodeURIComponent(shiftId)}/close`,
    { method: "POST", credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    message?: string;
    managers?: OnlineManagerBlockingClose[];
  };

  if (res.ok && json.success !== false) {
    return { kind: "closed" };
  }
  if (res.status === 400 && json.error === "UNFINISHED_TICKETS") {
    return { kind: "unfinished" };
  }
  if (res.status === 409 && json.error === "ONLINE_MANAGERS" && Array.isArray(json.managers)) {
    return { kind: "onlineManagers", managers: json.managers };
  }
  const extracted = extractQueueApiErrorMessage(json);
  return { kind: "error", status: res.status, error: extracted ?? json.error };
}

export async function forceManagerOfflineForShiftClose(managerId: string): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  const res = await fetch(
    `/api/queue/admin/managers/${encodeURIComponent(managerId)}/force-offline-for-shift`,
    { method: "POST", credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  const extracted = extractQueueApiErrorMessage(json);
  return {
    ok: res.ok && json.success !== false,
    status: res.status,
    error: extracted ?? json.error,
  };
}

/** Менеджеры филиала не в OFFLINE (доступен, перерыв, обед) — прокси /api/queue/managers. */
export async function fetchAvailableManagersForBranch(branchId: string): Promise<{
  ok: boolean;
  managers: Array<{ id: string; name: string; status: string }>;
  status: number;
  error?: string;
}> {
  const res = await fetch(
    `/api/queue/managers?branchId=${encodeURIComponent(branchId)}`,
    { credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    managers?: Array<{ id: string; name: string; status?: string }>;
    error?: string;
  };
  if (!res.ok) {
    const extracted = extractQueueApiErrorMessage(json);
    return {
      ok: false,
      managers: [],
      status: res.status,
      error: extracted ?? json.error ?? "queue_error",
    };
  }
  const list = Array.isArray(json.managers) ? json.managers : [];
  const managers = list.map((m) => ({
    ...m,
    status: String(m.status ?? ""),
  }));
  return { ok: true, managers, status: res.status };
}
