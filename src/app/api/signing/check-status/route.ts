import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { dealDocumentId } = body as { dealDocumentId?: string };
    if (!dealDocumentId) {
      return NextResponse.json({ error: "dealDocumentId required" }, { status: 400 });
    }

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const strapiOrigin = base;

    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?populate[customer][fields][0]=id&populate[customer][fields][1]=documentId&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return NextResponse.json({ error: "deal_not_found" }, { status: 404 });

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
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!isCustomer && !isStaff) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const res = await strapiAxios.post(
      `${base}/api/signed-agreements/check-status`,
      { dealDocumentId },
      { headers, timeout: 60_000 }
    );

    const data = res.data as any;

    const allSigned = data.allSigned ?? false;
    const firstSigned = data.documents?.find((d: any) => d.signed);

    return NextResponse.json({
      signed: allSigned,
      signedAt: firstSigned?.signedAt ?? null,
      documents: data.documents ?? [],
      allSigned,
    });
  } catch (e: any) {
    console.error("signing/check-status error:", e?.response?.data ?? e?.message);
    const status = e?.response?.status ?? 500;
    const msg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? "server_error";
    const isNetwork = msg === "doodocs_unavailable" || status === 503;
    return NextResponse.json(
      { error: isNetwork ? "doodocs_unavailable" : msg },
      { status: isNetwork ? 503 : status }
    );
  }
}
