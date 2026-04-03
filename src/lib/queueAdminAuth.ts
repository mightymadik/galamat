import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type CookieStoreLike = { get: (name: string) => { value?: string } | undefined };

export function requireAdminAccessToken(cookieStore: CookieStoreLike):
  | { access: string }
  | { response: NextResponse } {
  const access = cookieStore.get("access_token")?.value;
  if (!access) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const payload = verifyAccessToken(access);
  if (!payload?.sub || payload.role !== "admin") {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { access };
}

export function queueBackendUrl(path: string): string {
  return new URL(path, QUEUE_API_URL).toString();
}
