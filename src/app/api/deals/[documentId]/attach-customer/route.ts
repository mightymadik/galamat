import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone } from "@/lib/authOtp";

const ACTIVE_DEAL_STATUSES = ["Бронь", "Ожидания оплаты", "Ожидания договора"];

/** "dd.mm.yyyy" -> "yyyy-mm-dd" for Strapi date */
function toStrapiDate(s: string | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  const parts = t.split(/[.\-/]/);
  if (parts.length < 3) return null;
  const [d, m, y] = parts.map((p) => p.padStart(2, "0"));
  if (!d || !m || !y) return null;
  return `${y}-${m}-${d}`;
}

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
    if (!payload?.sub)
      return Response.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId)
      return Response.json({ error: "documentId is required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const phone = body?.phone != null ? String(body.phone).trim() : "";
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone)
      return Response.json({ error: "phone is required" }, { status: 400 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;
    const foundRes = await strapiAxios.get(findUrl, { headers });
    const list = (foundRes.data as any)?.data ?? [];
    let customerDocId: string | null = list[0]?.documentId ?? list[0]?.id ?? null;

    const updateData: Record<string, unknown> = {
      phone: normalizedPhone,
    };
    if (body?.lastName != null) updateData.surname = String(body.lastName).trim();
    if (body?.firstName != null) updateData.name = String(body.firstName).trim();
    if (body?.middleName != null) updateData.middlename = String(body.middleName).trim();
    if (body?.gender != null) updateData.gender = String(body.gender).trim();
    if (body?.email != null) updateData.email = body.email === "" ? null : String(body.email).trim();
    if (body?.address != null) updateData.address = body.address === "" ? null : String(body.address).trim();
    const birthDate = toStrapiDate(body?.dateOfBirth);
    if (birthDate) updateData.birthDate = birthDate;
    const dateIssue = toStrapiDate(body?.dateOfIssue);
    if (dateIssue) updateData.dateIssue = dateIssue;
    if (body?.docNumber != null && body?.docNumber !== "") {
      const v = String(body.docNumber).replace(/\D/g, "");
      updateData.docNumber = v ? parseInt(v, 10) : null;
    }
    if (body?.docIssuer != null) updateData.docIssuer = String(body.docIssuer).trim();
    if (body?.bik != null) updateData.bik = body.bik === "" ? null : String(body.bik).trim().toUpperCase();
    if (body?.iik != null) updateData.iik = body.iik === "" ? null : String(body.iik).trim().toUpperCase();
    if (body?.iin != null && body?.iin !== "") {
      const v = String(body.iin).replace(/\D/g, "");
      updateData.iin = v ? parseInt(v, 10) : null;
    }

    const bankDocumentIdRaw = body?.bankDocumentId != null ? String(body.bankDocumentId).trim() : "";
    const bankNameRaw = body?.bankName != null ? String(body.bankName).trim() : "";
    let bankDocumentId: string | null = bankDocumentIdRaw || null;
    let bankNumericId: number | null = null;

    // Resolve relation by bank name when documentId is not available on client.
    if (!bankDocumentId && bankNameRaw) {
      try {
        const bankByNameUrl =
          `${base}/api/banks` +
          `?filters[$or][0][nameBank][$eq]=${encodeURIComponent(bankNameRaw)}` +
          `&filters[$or][1][name][$eq]=${encodeURIComponent(bankNameRaw)}` +
          `&filters[$or][2][bankName][$eq]=${encodeURIComponent(bankNameRaw)}` +
          `&pagination[pageSize]=1`;
        let bankList: any[] = [];
        try {
          const bankRes = await strapiAxios.get(bankByNameUrl, { headers });
          bankList = (bankRes.data as any)?.data ?? [];
        } catch {
          // Fallback to public read when token has no banks permission.
          const publicRes = await fetch(bankByNameUrl, { cache: "no-store" });
          const publicJson = await publicRes.json().catch(() => ({}));
          bankList = Array.isArray((publicJson as any)?.data) ? (publicJson as any).data : [];
        }
        bankDocumentId = bankList[0]?.documentId ?? null;
        bankNumericId = typeof bankList[0]?.id === "number" ? bankList[0].id : null;
      } catch {
        bankDocumentId = null;
      }
    }

    // Defensive check: ignore stale bank ids to avoid hard 400 on customer update.
    if (bankDocumentId) {
      try {
        await strapiAxios.get(`${base}/api/banks/${encodeURIComponent(bankDocumentId)}?fields[0]=documentId`, { headers });
      } catch {
        bankDocumentId = null;
      }
    }

    if (bankDocumentId) {
      updateData.bank = { connect: [bankDocumentId] };
    } else if (bankNumericId) {
      updateData.bank = { connect: [bankNumericId] };
    }

    if (!customerDocId) {
      const createRes = await strapiAxios.post(
        `${base}/api/customers`,
        { data: { ...updateData, role: "customer" } },
        { headers }
      );
      const created = (createRes.data as any)?.data ?? createRes.data;
      customerDocId = created?.documentId ?? created?.id ?? null;
      if (!customerDocId)
        return Response.json({ error: "Не удалось создать клиента" }, { status: 502 });
    } else {
      await strapiAxios.put(
        `${base}/api/customers/${customerDocId}`,
        { data: updateData },
        { headers }
      );
    }

    // Force relation attach for one-to-one bank in case sanitized update ignored it.
    if (customerDocId && (bankDocumentId || bankNumericId)) {
      const bankAttachPayloads: Array<Record<string, unknown>> = [];
      if (bankDocumentId) {
        bankAttachPayloads.push({ bank: { connect: [bankDocumentId] } });
        bankAttachPayloads.push({ bank: { set: [bankDocumentId] } });
        bankAttachPayloads.push({ bank: { connect: [{ documentId: bankDocumentId }] } });
      }
      if (bankNumericId) {
        bankAttachPayloads.push({ bank: { connect: [bankNumericId] } });
        bankAttachPayloads.push({ bank: { set: [bankNumericId] } });
      }
      for (const payloadItem of bankAttachPayloads) {
        try {
          await strapiAxios.put(
            `${base}/api/customers/${customerDocId}`,
            { data: payloadItem },
            { headers }
          );
        } catch {
          // Try next format.
        }
      }
    }

    const currentDealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?fields[0]=documentId&populate[property]=true`,
      { headers }
    );
    const currentDeal: any = (currentDealRes.data as any)?.data ?? currentDealRes.data;
    const property = currentDeal?.property ?? currentDeal?.attributes?.property;
    const propertyDocId = property?.documentId ?? property?.id ?? null;
    if (!propertyDocId) {
      return Response.json({ error: "У сделки не найдена квартира" }, { status: 400 });
    }

    const managerRes = await strapiAxios.get(
      `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(payload.sub)}&pagination[pageSize]=1`,
      { headers }
    );
    const managerList = (managerRes.data as any)?.data ?? [];
    const managerDocId: string | null = managerList[0]?.documentId ?? managerList[0]?.id ?? null;

    const activeFilter = ACTIVE_DEAL_STATUSES.map((s, i) => `filters[dealStatus][$in][${i}]=${encodeURIComponent(s)}`).join("&");
    const existingDealsUrl =
      `${base}/api/deals` +
      `?filters[property][documentId][$eq]=${encodeURIComponent(propertyDocId)}` +
      `&filters[customer][documentId][$eq]=${encodeURIComponent(customerDocId)}` +
      `&filters[documentId][$ne]=${encodeURIComponent(documentId)}` +
      `&${activeFilter}` +
      `&pagination[pageSize]=1`;
    const existingRes = await strapiAxios.get(existingDealsUrl, { headers });
    const existingList = (existingRes.data as any)?.data ?? [];
    const existingDeal = Array.isArray(existingList) ? existingList[0] : null;
    const existingDealId = existingDeal?.documentId ?? existingDeal?.id ?? null;

    if (existingDealId) {
      if (managerDocId) {
        await strapiAxios.put(
          `${base}/api/deals/${existingDealId}`,
          { data: { manager: { connect: [managerDocId] } } },
          { headers }
        );
      }
      const dealRes = await strapiAxios.get(
        `${base}/api/deals/${documentId}?populate[property]=true`,
        { headers }
      );
      const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
      const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
      const doNotRelease = ["Договор подписан", "Ожидания договора", "Оплачено"].includes(dealStatus);
      if (!doNotRelease) {
        const prop = deal?.property ?? deal?.attributes?.property;
        const propId = prop?.documentId ?? prop?.id;
        if (propId) {
          await strapiAxios.put(
            `${base}/api/properties/${propId}`,
            { data: { propertyStatus: "свободно" } },
            { headers }
          );
        }
        await strapiAxios.put(
          `${base}/api/deals/${documentId}`,
          { data: { dealStatus: "Отменен" } },
          { headers }
        );
      }
      return Response.json({
        ok: true,
        customerDocumentId: customerDocId,
        useExistingDeal: true,
        dealDocumentId: existingDealId,
      });
    }

    const updatePayload: Record<string, unknown> = { customer: { connect: [customerDocId] } };
    if (managerDocId) updatePayload.manager = { connect: [managerDocId] };
    await strapiAxios.put(
      `${base}/api/deals/${documentId}`,
      { data: updatePayload },
      { headers }
    );

    return Response.json({ ok: true, customerDocumentId: customerDocId });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message = data?.error?.message ?? data?.message ?? err?.message;
    console.error("[deals/attach-customer]", status ?? "error", message ?? err);
    if (status === 404)
      return Response.json({ error: "Сделка не найдена" }, { status: 404 });
    if (status === 400)
      return Response.json(
        { error: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Некорректный запрос" },
        { status: 400 }
      );
    return Response.json(
      { error: status === 500 && message ? String(message) : "Не удалось привязать клиента к сделке" },
      { status: status ?? 500 }
    );
  }
}
