import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const PUBLIC_QUEUE_API_URL =
  process.env.NEXT_PUBLIC_QUEUE_API_URL ||
  process.env.VITE_SOCKET_URL ||
  "";
const SERVER_QUEUE_API_URL =
  process.env.QUEUE_API_URL ||
  process.env.QUEUE_BACKEND_URL ||
  "";

/**
 * GET /api/queue/socket-token
 *
 * Возвращает access_token и URL очереди для подключения сокета из браузера.
 * Токен берётся из httpOnly cookie; клиент использует его только для handshake Socket.IO.
 */
export async function GET() {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;

  if (!access) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    token: access,
    queueApiUrl: (PUBLIC_QUEUE_API_URL || SERVER_QUEUE_API_URL).trim(),
  });
}
