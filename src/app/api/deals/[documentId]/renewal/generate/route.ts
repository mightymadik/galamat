import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

/**
 * POST /api/deals/[documentId]/renewal/generate
 * Body: { newCustomerDocumentId: string, typedSum: number }
 * Proxies to Strapi custom controller `signed-agreements/generate-transfer`.
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

    const body = await req.json().catch(() => ({}));
    const { newCustomerDocumentId, typedSum } = body as { newCustomerDocumentId?: string; typedSum?: number };
    if (!newCustomerDocumentId || typeof newCustomerDocumentId !== "string")
      return NextResponse.json({ error: "newCustomerDocumentId required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();

    // Resolve manager
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

    // Enforce manager ownership (same logic as before).
    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${dealDocumentId}` +
        "?populate[property][populate][project][populate][developer][populate][confidant]=true" +
        "&populate[property][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[commerce][populate][project][populate][developer][populate][confidant]=true" +
        "&populate[commerce][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[parking][populate][project][populate][developer][populate][confidant]=true" +
        "&populate[parking][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[pantry][populate][project][populate][developer][populate][confidant]=true" +
        "&populate[pantry][populate][project][populate][complexes][fields][0]=complexAddress" +
        "&populate[customer]=true",
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    const managerId = deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
    if (effectiveRole === "manager" && managerId != null && Number(managerId) !== Number(payload.sub))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const totalSum = Number(typedSum) || 0;
    const generated = await strapiAxios.post(
      `${base}/api/signed-agreements/generate-transfer`,
      { dealDocumentId, newCustomerDocumentId, totalSum },
      { headers }
    );

    return NextResponse.json((generated.data as any) ?? { status: "ok" });
  } catch (e: any) {
    console.error("[deals/renewal/generate]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
