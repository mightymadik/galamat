import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone } from "@/lib/authOtp";

const ACTIVE_DEAL_STATUSES = ["Бронь", "Ожидания оплаты", "Согласование РОП", "Ожидания договора"];
const TYPE_CONFIG = {
  property: { relation: "property", apiPath: "properties", statusField: "propertyStatus", freeValue: "свободно" },
  commerce: { relation: "commerce", apiPath: "commerces", statusField: "saleStatus", freeValue: "открыто" },
  parking: { relation: "parking", apiPath: "parkings", statusField: "saleStatus", freeValue: "открыто" },
  pantry: { relation: "pantry", apiPath: "pantrys", statusField: "saleStatus", freeValue: "открыто" },
} as const;

type EntityType = keyof typeof TYPE_CONFIG;

function resolveDealEntity(deal: any): { type: EntityType; cfg: (typeof TYPE_CONFIG)[EntityType]; documentId: string | null } {
  for (const type of Object.keys(TYPE_CONFIG) as EntityType[]) {
    const cfg = TYPE_CONFIG[type];
    const rel = deal?.[cfg.relation] ?? deal?.attributes?.[cfg.relation];
    const id = rel?.documentId ?? rel?.id ?? rel?.data?.documentId ?? rel?.data?.id ?? null;
    if (id != null) return { type, cfg, documentId: String(id) };
  }
  return { type: "property", cfg: TYPE_CONFIG.property, documentId: null };
}

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

function normalizeBankName(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\b(ao|ао|jsc|акционерное общество)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBankName(item: any): string {
  const src = item?.attributes ?? item ?? {};
  const candidates = [src?.nameBank, src?.name, src?.bankName, src?.title, src?.bank];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
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
    let customerDocId: string | null = list[0]?.documentId ?? null;

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

    const bankPayload = body?.bank?.data ?? body?.bank ?? null;
    const bankPayloadAttrs = bankPayload?.attributes ?? bankPayload ?? {};
    const bankDocumentIdRaw =
      body?.bankDocumentId != null
        ? String(body.bankDocumentId).trim()
        : bankPayload?.documentId != null
          ? String(bankPayload.documentId).trim()
          : "";
    const bankNameRaw =
      body?.bankName != null
        ? String(body.bankName).trim()
        : extractBankName(bankPayloadAttrs);
    const bankRequested = Boolean(bankDocumentIdRaw || bankNameRaw);
    let bankDocumentId: string | null = null;

    const isFallbackId = bankDocumentIdRaw.startsWith("fallback-");

    if (bankDocumentIdRaw && !isFallbackId) {
      if (!/^\d+$/.test(bankDocumentIdRaw)) {
        bankDocumentId = bankDocumentIdRaw;
      }
    }

    // Resolve relation by bank name when documentId is not available on client.
    if (!bankDocumentId && bankNameRaw) {
      try {
        const bankByNameUrl = `${base}/api/banks?pagination[pageSize]=300`;
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

        const targetNorm = normalizeBankName(bankNameRaw);
        const withName = bankList
          .map((b) => ({
            item: b,
            rawName: extractBankName(b),
            normName: normalizeBankName(extractBankName(b)),
          }))
          .filter((x) => !!x.rawName);

        const exact = withName.find((x) => x.normName === targetNorm);
        const fuzzy = withName.find(
          (x) => x.normName.includes(targetNorm) || targetNorm.includes(x.normName)
        );
        const picked = exact?.item ?? fuzzy?.item ?? null;

        bankDocumentId = picked?.documentId ?? null;
      } catch {
        bankDocumentId = null;
      }
    }

    if (bankRequested && !bankDocumentId) {
      console.error("[deals/attach-customer] bank resolve failed", {
        bankDocumentIdRaw,
        bankNameRaw,
      });
      return Response.json(
        {
          error:
            "Не удалось получить банк из Strapi. Проверьте права STRAPI_API_TOKEN на banks (find/findOne) и что /api/banks не отдает fallback-список.",
        },
        { status: 502 }
      );
    }

    if (!customerDocId) {
      const createRes = await strapiAxios.post(
        `${base}/api/customers`,
        { data: { ...updateData, role: "customer" } },
        { headers }
      );
      const created = (createRes.data as any)?.data ?? createRes.data;
      customerDocId = created?.documentId ?? null;
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
    if (customerDocId && bankDocumentId) {
      let lastAttachError: string | null = null;
      try {
        await strapiAxios.put(
          `${base}/api/customers/${customerDocId}`,
          {
            data: {
              // Prefer explicit relation connect for D&P edge cases.
              bank: { connect: [{ documentId: bankDocumentId, status: "published" }] },
            },
          },
          { headers }
        );
      } catch (err: any) {
        const msg =
          err?.response?.data?.error?.message ??
          err?.response?.data?.error ??
          err?.message ??
          "unknown_attach_error";
        lastAttachError = String(msg);
      }

      // Best-effort verification: do not block deal flow on admin display mismatch.
      try {
        const verifyUrls = [
          `${base}/api/customers/${customerDocId}?populate=bank`,
          `${base}/api/customers/${customerDocId}?populate=bank&status=published`,
          `${base}/api/customers/${customerDocId}?populate=bank&status=draft`,
        ];
        let attachedBankDocId: string | null = null;
        for (const verifyUrl of verifyUrls) {
          const customerCheckRes = await strapiAxios.get(verifyUrl, { headers });
          const customerCurrent: any = (customerCheckRes.data as any)?.data ?? customerCheckRes.data;
          const bankRel = customerCurrent?.bank ?? customerCurrent?.attributes?.bank;
          const bankData = bankRel?.data ?? bankRel;
          attachedBankDocId = bankData?.documentId ?? null;
          if (attachedBankDocId) break;
        }
        if (!attachedBankDocId && bankRequested) {
          console.error("[deals/attach-customer] bank attach not visible after update", {
            customerDocId,
            bankDocumentId,
            lastAttachError,
          });
        }
      } catch {
        if (bankRequested) {
          console.error("[deals/attach-customer] bank attach verification request failed", {
            customerDocId,
            bankDocumentId,
          });
        }
      }
    }

    const currentDealRes = await strapiAxios.get(
      `${base}/api/deals/${documentId}?fields[0]=documentId&populate[property]=true&populate[commerce]=true&populate[parking]=true&populate[pantry]=true`,
      { headers }
    );
    const currentDeal: any = (currentDealRes.data as any)?.data ?? currentDealRes.data;
    const entity = resolveDealEntity(currentDeal);
    if (!entity.documentId) {
      return Response.json({ error: "У сделки не найден объект" }, { status: 400 });
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
      `?filters[${entity.cfg.relation}][documentId][$eq]=${encodeURIComponent(entity.documentId)}` +
      `&filters[customer][documentId][$eq]=${encodeURIComponent(customerDocId)}` +
      `&filters[documentId][$ne]=${encodeURIComponent(documentId)}` +
      `&${activeFilter}` +
      `&pagination[pageSize]=1`;
    const existingRes = await strapiAxios.get(existingDealsUrl, { headers });
    const existingList = (existingRes.data as any)?.data ?? [];
    const existingDeal = Array.isArray(existingList) ? existingList[0] : null;
    const existingDealId = existingDeal?.documentId ?? null;

    if (existingDealId) {
      if (managerDocId) {
        await strapiAxios.put(
          `${base}/api/deals/${existingDealId}`,
          { data: { manager: { connect: [managerDocId] } } },
          { headers }
        );
      }
      const dealRes = await strapiAxios.get(
        `${base}/api/deals/${documentId}?populate[property]=true&populate[commerce]=true&populate[parking]=true&populate[pantry]=true`,
        { headers }
      );
      const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
      const dealStatus = deal?.dealStatus ?? deal?.attributes?.dealStatus;
      const doNotRelease = ["Договор подписан", "Ожидания договора", "Оплачено"].includes(dealStatus);
      if (!doNotRelease) {
        const releaseEntity = resolveDealEntity(deal);
        const propId = releaseEntity.documentId;
        if (propId) {
          await strapiAxios.put(
            `${base}/api/${releaseEntity.cfg.apiPath}/${propId}`,
            { data: { [releaseEntity.cfg.statusField]: releaseEntity.cfg.freeValue } },
            { headers }
          );
          try {
            await strapiAxios.post(`${base}/api/${releaseEntity.cfg.apiPath}/${propId}/publish`, {}, { headers });
          } catch (_) {}
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
