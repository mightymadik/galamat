import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { propertyDocumentId, dealDocumentId, usedPromocodeCode, usedGalaBonusAmount } = body as {
      propertyDocumentId?: string;
      dealDocumentId?: string;
      usedPromocodeCode?: string;
      usedGalaBonusAmount?: number;
    };
    console.log("[pay/complete] start", {
      propertyDocumentId: asString(propertyDocumentId),
      dealDocumentId: asString(dealDocumentId),
      hasPromocode: Boolean(usedPromocodeCode),
      usedGalaBonusAmount: usedGalaBonusAmount ?? 0,
    });
    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const customerId = Number(payload.sub);
    let customerDocumentId: string | null = null;
    try {
      const custRes = await strapiAxios.get(
        `${base}/api/customers?filters[id][$eq]=${customerId}&pagination[pageSize]=1&fields[0]=documentId`,
        { headers }
      );
      const cust = (custRes.data as any)?.data?.[0];
      customerDocumentId = cust?.documentId ?? null;
    } catch {
      customerDocumentId = null;
    }

    const incomingKey = req.headers.get("Idempotency-Key")?.trim();
    const idempotencyKey = incomingKey || crypto.randomUUID();
    const completeRes = await strapiAxios.post(
      `${base}/api/payments?complete=true`,
      {
        propertyDocumentId,
        dealDocumentId,
        usedPromocodeCode,
        usedGalaBonusAmount,
        customerDocumentId,
      },
      {
        headers: {
          ...headers,
          "Idempotency-Key": idempotencyKey,
        },
      }
    );
    console.log("[pay/complete] complete=true success", {
      dealDocumentId: asString(dealDocumentId),
      propertyDocumentId: asString(propertyDocumentId),
    });

    if (dealDocumentId) {
      try {
        console.log("[pay/complete] calling backend send-webhook", { dealDocumentId });
        await strapiAxios.post(
          `${base}/api/deals/actions/send-webhook/${encodeURIComponent(dealDocumentId)}`,
          {
            status: "registration",
            promoCode: asString(usedPromocodeCode),
            galaBonusSum: usedGalaBonusAmount ?? 0,
          },
          { headers }
        );
        console.log("[pay/complete] send-webhook ok");
      } catch (webhookError: any) {
        console.error("[pay/complete] send-webhook error:", webhookError?.response?.data ?? webhookError?.message);
      }
    } else {
      console.warn("[pay/complete] skip webhook: empty dealDocumentId");
    }

    return NextResponse.json(completeRes.data ?? { status: "ok", message: "complete" });
  } catch (e: any) {
    console.error("pay/complete error:", e?.response?.status, e?.response?.config?.url, e?.response?.data ?? e);
    return NextResponse.json({ status: "error", message: e?.message ?? "server_error" }, { status: 500 });
  }
}