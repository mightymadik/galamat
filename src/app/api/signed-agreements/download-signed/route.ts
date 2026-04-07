import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";

/** Эндпоинт только для PDF договора — всегда inline, чтобы вкладка, а не «Сохранить». */
function normalizePdfContentType(raw: string | null): string {
  if (!raw?.trim()) return "application/pdf";
  const base = raw.split(";")[0].trim().toLowerCase();
  if (base === "application/octet-stream" || base === "binary/octet-stream") return "application/pdf";
  return raw.split(";")[0].trim();
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return new NextResponse("unauthorized", { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return new NextResponse("unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const doodocsDocumentId = searchParams.get("doodocsDocumentId");
    const dealDocumentId = searchParams.get("dealDocumentId");
    if (!doodocsDocumentId)
      return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const backendUrl = `${base}/api/signed-agreements/download-signed?doodocsDocumentId=${encodeURIComponent(doodocsDocumentId)}${dealDocumentId ? `&dealDocumentId=${encodeURIComponent(dealDocumentId)}` : ""}`;
    const res = await fetch(
      backendUrl,
      { headers, signal: AbortSignal.timeout(60_000) }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "download_failed");
      return new NextResponse(text, { status: res.status });
    }

    const contentType = normalizePdfContentType(res.headers.get("content-type"));

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
      },
    });
  } catch (e: any) {
    console.error("[download-signed proxy]", e?.message);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
