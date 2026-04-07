import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl } from "@/lib/strapiServer";

function guessMimeFromPath(path: string, upstream: string): string {
  const u = upstream.toLowerCase().split(";")[0].trim();
  if (u && u !== "application/octet-stream" && u !== "binary/octet-stream") return upstream.split(";")[0].trim();
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  return upstream.split(";")[0].trim() || "application/octet-stream";
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

/**
 * Прокси файлов из Strapi /uploads. Доступ только с валидным JWT (cookie или Bearer).
 * Защита глубже — закрыть прямой доступ к Strapi /uploads на nginx/сети.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || getBearer(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const auth = verifyAccessToken(token);
  if (!auth?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const name = searchParams.get("name")?.trim() || "";
  if (!path || !path.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "galamat-media-file-proxy" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    const rawType = res.headers.get("content-type") || "application/octet-stream";
    const contentType = guessMimeFromPath(path, rawType);
    const disposition = name
      ? `inline; filename*=UTF-8''${encodeURIComponent(name)}`
      : "inline";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[media/file]", msg);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
