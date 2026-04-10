import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectDocumentId = url.searchParams.get("projectDocumentId")?.trim();
    const agreementType = url.searchParams.get("agreementType")?.trim() ?? "Квартиры";
    if (!projectDocumentId)
      return NextResponse.json({ status: "error", message: "projectDocumentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const res = await strapiAxios.get(
      `${base}/api/signed-agreements/available-base-contract-types`,
      {
        headers,
        params: { projectDocumentId, agreementType },
        timeout: 30_000,
      }
    );

    return NextResponse.json(res.data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.message ??
      "server_error";
    console.error("[available-base-contract-types proxy]", status, msg);
    return NextResponse.json({ status: "error", message: msg }, { status });
  }
}
