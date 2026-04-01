import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";

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

    const contentType = res.headers.get("content-type") ?? "application/pdf";
    const contentDisposition = res.headers.get("content-disposition") ?? "";

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentDisposition && { "Content-Disposition": contentDisposition }),
      },
    });
  } catch (e: any) {
    console.error("[download-signed proxy]", e?.message);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
