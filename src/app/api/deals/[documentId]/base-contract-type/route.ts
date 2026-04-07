import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const raw = String(body?.baseContractType ?? "").trim().toUpperCase();
    const baseContractType = raw === "ПДБ" || raw === "PDB" ? "ПДБ" : "ДДУ";

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      { data: { baseContractType } },
      { headers }
    );

    return NextResponse.json({ ok: true, baseContractType });
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.error?.message ?? err?.message;
    return NextResponse.json(
      { error: "server_error", detail: message },
      { status: status && status >= 400 && status < 600 ? status : 500 }
    );
  }
}
