import type { ManagerOptions, SocketOptions } from "socket.io-client";

const SOCKET_PATH = "/socket.io";

/**
 * Auth для Socket.IO: на каждом подключении и переподключении запрашивает свежий JWT
 * из httpOnly cookie через Route Handler. Иначе после refresh сессии или истечения
 * токена клиент продолжал бы ходить на handshake со старым auth → 400 / connect_error.
 */
export function createQueueSocketAuthCallback(): (
  cb: (data: Record<string, unknown>) => void,
) => void {
  return (cb) => {
    fetch("/api/queue/socket-token", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return {};
        return res.json().catch(() => ({}));
      })
      .then((body: { token?: string }) => {
        if (body?.token) {
          cb({ token: body.token });
        } else {
          cb({});
        }
      })
      .catch(() => cb({}));
  };
}

export function getDefaultQueueSocketOptions(): Partial<ManagerOptions & SocketOptions> {
  return {
    auth: createQueueSocketAuthCallback(),
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  };
}
