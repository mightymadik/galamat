import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";

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
      return NextResponse.json(
        { status: "error", message: "dealDocumentId required" },
        { status: 400 }
      );

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const strapiOrigin = base;

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?fields[0]=dealStatus&populate[customer][fields][0]=id&populate[customer][fields][1]=documentId&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) {
      return NextResponse.json({ status: "error", message: "deal_not_found" }, { status: 404 });
    }

    const rawCustomer = deal?.customer ?? deal?.attributes?.customer;
    const customerNode = (rawCustomer as any)?.data ?? rawCustomer;
    const dealCustomerIdRaw = customerNode?.id ?? customerNode?.attributes?.id ?? null;
    const dealCustomerDocIdRaw =
      customerNode?.documentId ?? customerNode?.attributes?.documentId ?? null;
    const dealCustomerId = dealCustomerIdRaw != null ? Number(dealCustomerIdRaw) : null;
    const isCustomerById =
      dealCustomerId != null && Number.isFinite(dealCustomerId) && dealCustomerId === Number(payload.sub);
    let isCustomerByDocumentId = false;
    if (!isCustomerById && dealCustomerDocIdRaw != null) {
      try {
        const meRes = await strapiAxios.get(
          `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(String(payload.sub))}&pagination[pageSize]=1&fields[0]=documentId`,
          { headers }
        );
        const me = (meRes.data as any)?.data?.[0];
        const meDocId = me?.documentId ?? me?.attributes?.documentId ?? null;
        isCustomerByDocumentId = meDocId != null && String(meDocId) === String(dealCustomerDocIdRaw);
      } catch {
        isCustomerByDocumentId = false;
      }
    }
    const isCustomer = isCustomerById || isCustomerByDocumentId;

    const effectiveRole = await resolveEffectiveRole(payload, strapiOrigin, headers);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isStaff = roleLower === "admin" || roleLower === "manager" || roleLower === "cashier" || roleLower === "rop";
    if (isStaff && roleLower === "manager" && managerForbiddenForDeal(effectiveRole, payload.sub, deal)) {
      return NextResponse.json({ status: "error", message: "forbidden" }, { status: 403 });
    }
    if (!isCustomer && !isStaff) {
      return NextResponse.json({ status: "error", message: "forbidden" }, { status: 403 });
    }

    const dealStatus = String(deal?.dealStatus ?? deal?.attributes?.dealStatus ?? "").trim();
    /**
     * Не блокируем отправку по статусу сделки на уровне фронта.
     * Статусы в реальном процессе могут отличаться (ДДУ/ПДБ, разные пайплайны),
     * а реальная проверка должна происходить в Strapi `signed-agreements/send-to-sign`.
     *
     * Ранее здесь была жёсткая проверка на "Ожидания договора"/"Договор подписан",
     * из-за чего документы с `requiresSigning=true` могли никогда не отправляться.
     */
    void dealStatus;

    const res = await strapiAxios.post(
      `${base}/api/signed-agreements/send-to-sign`,
      { dealDocumentId },
      { headers, timeout: 120_000 }
    );

    const data = res.data as any;

    return NextResponse.json({
      status: "ok",
      documents: data.documents ?? [],
      documentId: data.documents?.[0]?.doodocsDocumentId ?? null,
      signUrl: data.documents?.[0]?.signUrl ?? null,
    });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.message ??
      "server_error";
    if (status === 404 && msg === "no_unsigned_agreements") {
      return NextResponse.json({
        status: "ok",
        documents: [],
        documentId: null,
        signUrl: null,
        reused: true,
        message: "no_unsigned_agreements",
      });
    }
    console.error("[signing/start proxy]", status, msg);
    return NextResponse.json({ status: "error", message: msg }, { status });
  }
}
