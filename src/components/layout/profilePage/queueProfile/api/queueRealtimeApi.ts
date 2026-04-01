import { io, type Socket } from "socket.io-client";

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
    if (!body?.token) return null;
    const socketUrl = body.queueApiUrl?.trim() || undefined;

    let socket: Socket | null = io(socketUrl, {
      auth: { token: body.token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket?.emit("subscribe:branch", branchId);
    });

    const handleQueueUpdate = () => {
      onUpdate();
    };

    // В текущем бэкенде событие очереди называется `queue-updated`,
    // а этот UI раньше слушал устаревшее `queue:update`.
    socket.on("queue:update", handleQueueUpdate);
    socket.on("queue-updated", handleQueueUpdate);

    socket.on("connect_error", () => {
      // тихо игнорируем — список всё равно обновляется по refresh/первой загрузке
    });

    return () => {
      if (!socket) return;
      socket.emit("unsubscribe:branch", branchId);
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    };
  } catch {
    return null;
  }
}

