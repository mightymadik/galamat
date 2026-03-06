import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "api.galamat.kz",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.host)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  // Важно: проксируем как есть
  const upstream = await fetch(target.toString(), {
    // иногда апстрим ругается без UA
    headers: { "User-Agent": "galamat-pdf-proxy" },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const buf = await upstream.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // чтобы браузер мог кешировать при желании (можешь убрать)
      "Cache-Control": "public, max-age=86400",
    },
  });
}