import { NextResponse } from "next/server";

/**
 * GET /api/proxy-image?url=...
 * Проксирует картинку для генерации PDF (обход CORS).
 * В development разрешён любой хост; в production — только из env (STRAPI_URL, NEXT_PUBLIC_APP_URL и т.д.).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const rawUrl = searchParams.get("url");
        if (!rawUrl || typeof rawUrl !== "string") {
            return NextResponse.json({ error: "url required" }, { status: 400 });
        }
        let url: URL;
        try {
            url = new URL(rawUrl);
        } catch {
            return NextResponse.json({ error: "invalid url" }, { status: 400 });
        }

        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
            const allowedHosts: string[] = [];
            const addHost = (envUrl: string | undefined) => {
                if (typeof envUrl === "string" && envUrl) {
                    try {
                        allowedHosts.push(new URL(envUrl).host);
                    } catch {}
                }
            };
            addHost(process.env.NEXT_PUBLIC_APP_URL);
            addHost(process.env.STRAPI_URL);
            addHost(process.env.STRAPI_PUBLIC_URL);
            addHost(process.env.NEXT_PUBLIC_STRAPI_URL);
            if (allowedHosts.length === 0) {
                allowedHosts.push("localhost", "127.0.0.1");
            }
            if (!allowedHosts.some((h) => url.host === h || url.host.endsWith("." + h))) {
                return NextResponse.json({ error: "url not allowed" }, { status: 403 });
            }
        }

        const res = await fetch(url.toString(), {
            headers: { Accept: "image/*" },
            cache: "no-store",
        });
        if (!res.ok) {
            return NextResponse.json({ error: "upstream failed" }, { status: res.status });
        }
        const contentType = res.headers.get("content-type") || "image/png";
        const blob = await res.arrayBuffer();
        return new Response(blob, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, no-cache",
            },
        });
    } catch (e) {
        console.error("[proxy-image]", e);
        return NextResponse.json({ error: "proxy failed" }, { status: 500 });
    }
}
