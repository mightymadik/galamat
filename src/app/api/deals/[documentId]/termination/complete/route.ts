import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import {
  dealHasSignedAgreementOfTemplate,
  managerForbiddenForDeal,
  resolveEffectiveRole,
} from "@/lib/dealManagerAuth";

/**
 * POST /api/deals/[documentId]/termination/complete
 * Sets deal dealStatus to "Расторжение", returns apartment to available, sends webhook via backend.
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

    const effectiveRole = await resolveEffectiveRole(payload, base, headers);
    if (effectiveRole !== "manager" && effectiveRole !== "admin")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${dealDocumentId}?populate[property]=true&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });

    if (managerForbiddenForDeal(effectiveRole, payload.sub, deal))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const terminationSigned = await dealHasSignedAgreementOfTemplate(
      base,
      headers,
      dealDocumentId,
      "Расторжение"
    );
    if (!terminationSigned) {
      return NextResponse.json(
        { error: "Сначала дождитесь подписания соглашения о расторжении (проверка статуса в Doodocs)" },
        { status: 400 }
      );
    }

    const property = deal?.property ?? deal?.attributes?.property;
    const propData = (property as any)?.data ?? property;
    const propertyDocumentId = propData?.documentId ?? propData?.id;
    if (propertyDocumentId) {
      await strapiAxios.put(
        `${base}/api/properties/${propertyDocumentId}`,
        { data: { propertyStatus: "свободно", saleStatus: "открыто" } },
        { headers }
      );
      try {
        await strapiAxios.post(`${base}/api/properties/${propertyDocumentId}/publish`, {}, { headers });
      } catch (_) {}
    }

    await strapiAxios.put(
      `${base}/api/deals/${dealDocumentId}`,
      { data: { dealStatus: "Расторжение" } },
      { headers }
    );

    try {
      await strapiAxios.post(
        `${base}/api/deals/actions/send-webhook/${encodeURIComponent(dealDocumentId)}`,
        { status: "termination" },
        { headers }
      );
      console.log("[termination/complete] send-webhook ok");
    } catch (webhookError: any) {
      console.error("[termination/complete] send-webhook error:", webhookError?.response?.data ?? webhookError?.message);
    }

    return NextResponse.json({ status: "ok", message: "Сделка расторгнута" });
  } catch (e: any) {
    console.error("[deals/termination/complete]", e?.response?.data ?? e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
