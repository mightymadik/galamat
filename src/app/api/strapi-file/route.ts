import { NextRequest, NextResponse } from "next/server";
import { getStrapiBaseUrl } from "@/lib/strapiServer";

/**
 * Proxies Strapi storage files so the browser can access them regardless of Strapi's internal URL.
 * Usage: /api/strapi-file?path=/uploads/xxx.docx
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path || !path.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "galamat-strapi-file-proxy" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    console.error("[strapi-file] fetch failed:", e?.message);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
