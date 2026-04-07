import { io, type Socket } from "socket.io-client";
import { getDefaultQueueSocketOptions } from "@/lib/queueSocket";

type QueueSocketTokenResponse = {
  token?: string;
  queueApiUrl?: string;
};

/**
 * Подключение к сокету очереди по branchId.
 * Возвращает функцию отписки, которую нужно вызвать в cleanup.
 */
export async function subscribeToQueueBranchUpdates(
  branchId: string,
  onUpdate: () => void,
): Promise<(() => void) | null> {
  try {
    const res = await fetch("/api/queue/socket-token", {
      credentials: "include",
    });
    const body = (await res.json().catch(() => ({}))) as QueueSocketTokenResponse;
    if (!res.ok) return null;
    const socketUrl = body.queueApiUrl?.trim() || undefined;

    let socket: Socket | null = io(socketUrl, {
      ...getDefaultQueueSocketOptions(),
    });

    const MIN_REFRESH_INTERVAL_MS = 1000;
    let lastRefreshAt = 0;
    const safeRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) return;
      lastRefreshAt = now;
      onUpdate();
    };

    const resync = () => {
      socket?.emit("subscribe:branch", branchId);
      safeRefresh();
    };

    socket.on("connect", resync);

    const handleQueueUpdate = () => {
      safeRefresh();
    };

    // В текущем бэкенде событие очереди называется `queue-updated`,
    // а этот UI раньше слушал устаревшее `queue:update`.
    socket.on("queue:update", handleQueueUpdate);
    socket.on("queue-updated", handleQueueUpdate);
    socket.on("manager:status-updated", handleQueueUpdate);

    socket.on("connect_error", () => {
      // тихо игнорируем — список всё равно обновляется по refresh/первой загрузке
    });

    // Ensure first paint also gets a fresh HTTP state, even before socket events arrive.
    safeRefresh();

    return () => {
      if (!socket) return;
      socket.emit("unsubscribe:branch", branchId);
      socket.off("connect", resync);
      socket.off("queue:update", handleQueueUpdate);
      socket.off("queue-updated", handleQueueUpdate);
      socket.off("manager:status-updated", handleQueueUpdate);
      socket.disconnect();
      socket = null;
    };
  } catch {
    return null;
  }
}

