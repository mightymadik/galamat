import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { dealDocumentId } = body as { dealDocumentId?: string };
    if (!dealDocumentId)
      return NextResponse.json({ status: "error", message: "dealDocumentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const res = await strapiAxios.post(
      `${base}/api/signed-agreements/generate-termination`,
      { dealDocumentId },
      { headers, timeout: 60_000 }
    );

    const data = res.data as any;

    if (data.fileUrl) {
      const url = new URL(data.fileUrl, base);
      data.fileUrl = `/api/strapi-file?path=${encodeURIComponent(url.pathname)}`;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? "server_error";
    console.error("[generate-termination proxy]", status, msg);
    return NextResponse.json({ status: "error", message: msg }, { status });
  }
}
