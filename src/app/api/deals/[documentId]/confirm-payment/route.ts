import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return Response.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    // AuthZ: только владелец сделки или staff.
    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(documentId)}?populate[customer][fields][0]=id&populate[customer][fields][1]=documentId&populate[manager][fields][0]=id`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    if (!deal) return Response.json({ error: "Сделка не найдена" }, { status: 404 });

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

    const effectiveRole = await resolveEffectiveRole(payload, base, headers);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isStaff = roleLower === "admin" || roleLower === "manager" || roleLower === "cashier" || roleLower === "rop";
    if (isStaff && roleLower === "manager" && managerForbiddenForDeal(effectiveRole, payload.sub, deal)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (!isCustomer && !isStaff) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    await strapiAxios.post(
      `${base}/api/deals?confirmPayment=true&dealId=${encodeURIComponent(documentId)}`,
      body,
      { headers }
    );

    return Response.json({ ok: true });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/confirm-payment]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    if (status === 400)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Некорректный запрос" },
        { status: 400 }
      );
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось сохранить условия оплаты" },
      { status: status ?? 500 }
    );
  }
}
