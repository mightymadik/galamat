import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { toClientMediaUrl } from "@/lib/uploadsProxyUrl";

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

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const res = await strapiAxios.post(
      `${base}/api/signed-agreements/generate`,
      { ...body, customerId: payload.sub },
      { headers, timeout: 120_000 }
    );

    const data = res.data as any;
    const toProxyUrl = (url: string | null | undefined): string | null => {
      if (!url || typeof url !== "string") return url ?? null;
      return toClientMediaUrl(url);
    };
    if (data?.fileUrl) data.fileUrl = toProxyUrl(data.fileUrl) ?? data.fileUrl;
    if (Array.isArray(data?.files)) {
      data.files = data.files.map((f: any) =>
        f?.fileUrl ? { ...f, fileUrl: toProxyUrl(f.fileUrl) ?? f.fileUrl } : f
      );
    }
    return NextResponse.json(data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.message ??
      "server_error";
    console.error("[signed-agreements/generate proxy]", status, msg);
    return NextResponse.json({ status: "error", message: msg }, { status });
  }
}
