import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * POST /api/deals/[documentId]/termination/complete
 * Sets deal dealStatus to "Расторжение" and returns the apartment to available (propertyStatus: свободно, saleStatus: открыто).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId: dealDocumentId } = await params;
    if (!dealDocumentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    let effectiveRole: string = payload.role ?? "customer";
    if (effectiveRole !== "manager" && effectiveRole !== "admin") {
      const customerRes = await strapiAxios
        .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
        .catch(() => null);
      const customer: any = (customerRes?.data as any)?.data?.[0];
      effectiveRole = customer?.role ?? customer?.attributes?.role ?? effectiveRole;
    }
    if (effectiveRole !== "manager" && effectiveRole !== "admin")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${dealDocumentId}?populate[property]=true&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    if (effectiveRole === "manager" && managerId != null && Number(managerId) !== Number(payload.sub))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const property = deal?.property ?? deal?.attributes?.property;
    const propData = (property as any)?.data ?? property;
    const propertyDocumentId = propData?.documentId ?? propData?.id;
    if (propertyDocumentId) {
      await strapiAxios.put(
        `${base}/api/properties/${propertyDocumentId}`,
        { data: { propertyStatus: "свободно", saleStatus: "открыто" } },
        { headers }
      );
    }

    await strapiAxios.put(
      `${base}/api/deals/${dealDocumentId}`,
      { data: { dealStatus: "Расторжение" } },
      { headers }
    );

    return NextResponse.json({ status: "ok", message: "Сделка расторгнута" });
  } catch (e: any) {
    console.error("[deals/termination/complete]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
