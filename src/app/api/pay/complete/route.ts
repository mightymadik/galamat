import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

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

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    // Фиксируем сделку и квартиру после «Завершить» — квартира не должна снова стать доступной для бронирования.
    if (dealDocumentId) {
      try {
        const dealRes = await strapiAxios.get(
          `${base}/api/deals/${dealDocumentId}?populate[property]=true&fields[0]=dealStatus`,
          { headers }
        );
        const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
        const status = deal?.dealStatus ?? deal?.attributes?.dealStatus;
        if (status !== "Договор подписан") {
          await strapiAxios.put(
            `${base}/api/deals/${dealDocumentId}`,
            { data: { dealStatus: "Договор подписан" } },
            { headers }
          );
        }
        let property = deal?.property ?? deal?.attributes?.property;
        if (property && typeof property === "object" && "data" in property)
          property = (property as { data?: { documentId?: string; id?: string } }).data;
        const propertyDocId = property?.documentId ?? (property as any)?.id ?? propertyDocumentId;
        if (propertyDocId) {
          await strapiAxios.put(
            `${base}/api/properties/${propertyDocId}`,
            { data: { propertyStatus: "договор", saleStatus: "закрыто" } },
            { headers }
          );
          try {
            // снять с публикации, чтобы квартира не отображалась в каталоге
            await strapiAxios.post(`${base}/api/properties/${propertyDocId}/unpublish`, {}, { headers });
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        console.error("pay/complete deal/property update:", e?.response?.data ?? e);
      }
    }

    // Если нет dealDocumentId, но есть propertyDocumentId — всё равно закрываем продажу и снимаем публикацию квартиры.
    if (!dealDocumentId && propertyDocumentId) {
      try {
        await strapiAxios.put(
          `${base}/api/properties/${propertyDocumentId}`,
          { data: { propertyStatus: "договор", saleStatus: "закрыто" } },
          { headers }
        );
        await strapiAxios.post(`${base}/api/properties/${propertyDocumentId}/unpublish`, {}, { headers });
      } catch (e: any) {
        console.error("pay/complete property close/unpublish:", e?.response?.data ?? e);
      }
    }

    let projectDocumentId: string | null = null;
    if (propertyDocumentId) {
      const propRes = await strapiAxios.get(
        `${base}/api/properties?filters[documentId][$eq]=${encodeURIComponent(propertyDocumentId)}&pagination[pageSize]=1&populate[project][fields][0]=documentId`,
        { headers }
      );
      const prop = (propRes.data as any)?.data?.[0];
      const project = prop?.project ?? prop?.attributes?.project?.data ?? prop?.attributes?.project;
      const projDocId = project?.documentId ?? project?.attributes?.documentId;
      if (projDocId != null) projectDocumentId = String(projDocId);
    }

    const customerId = Number(payload.sub);

    let customerDocumentId: string | null = null;
    try {
      const custRes = await strapiAxios.get(
        `${base}/api/customers?filters[id][$eq]=${customerId}&pagination[pageSize]=1&fields[0]=documentId`,
        { headers }
      );
      const cust = (custRes.data as any)?.data?.[0];
      customerDocumentId = cust?.documentId ?? cust?.attributes?.documentId ?? null;
    } catch {
      customerDocumentId = null;
    }

    if (usedPromocodeCode && projectDocumentId && propertyDocumentId && customerDocumentId) {
      const codeTrimmed = String(usedPromocodeCode).trim().toUpperCase();
      if (codeTrimmed) {
        const promoListRes = await strapiAxios.get(
          `${base}/api/promocodes?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}&pagination[pageSize]=100&populate[promocodes][populate]=*`,
          { headers }
        );
        const promoList: any[] = (promoListRes.data as any)?.data ?? [];
        const nowIso = new Date().toISOString();

        for (const doc of promoList) {
          const attrs = doc?.attributes ?? doc;
          const arr = Array.isArray(attrs?.promocodes) ? attrs.promocodes : [];
          const idx = arr.findIndex(
            (p: any) => String(p?.promocode ?? p?.attributes?.promocode ?? "").trim().toUpperCase() === codeTrimmed
          );
          if (idx === -1) continue;

          const updated = arr.map((entry: any, i: number) => {
            const raw = entry?.attributes ?? entry;
            const existingProp =
              raw?.property?.documentId ??
              (typeof raw?.property === "string" ? raw.property : null) ??
              entry?.property?.documentId ??
              null;
            const existingUser =
              raw?.user?.documentId ??
              (typeof raw?.user === "string" ? raw.user : null) ??
              entry?.user?.documentId ??
              null;

            if (i !== idx) {
              return {
                promocode: raw?.promocode ?? entry?.promocode,
                activatedAt: raw?.activatedAt ?? entry?.activatedAt ?? null,
                active: raw?.active ?? entry?.active ?? true,
                property: existingProp ?? null,
                user: existingUser ?? null,
              };
            }
            return {
              promocode: raw?.promocode ?? entry?.promocode ?? codeTrimmed,
              activatedAt: nowIso,
              active: false,
              property: propertyDocumentId,
              user: customerDocumentId,
            };
          });

          const promoDocId = doc.documentId ?? doc.id;
          await strapiAxios.put(`${base}/api/promocodes/${promoDocId}`, { data: { promocodes: updated } }, { headers });
          break;
        }
      }
    }

    if (usedGalaBonusAmount != null && usedGalaBonusAmount > 0 && (customerDocumentId != null || customerId)) {
      const userFilter =
        customerDocumentId != null
          ? `filters[user][documentId][$eq]=${encodeURIComponent(customerDocumentId)}`
          : `filters[user][id][$eq]=${customerId}`;

      const bonusesRes = await strapiAxios.get(
        `${base}/api/gala-bonuses?${userFilter}&pagination[pageSize]=100&sort[0]=id:asc`,
        { headers }
      );
      const bonusList: any[] = (bonusesRes.data as any)?.data ?? [];
      const nowIso = new Date().toISOString().slice(0, 10);

      for (const item of bonusList) {
        const attrs = item?.attributes ?? item;
        if (attrs?.active === false || attrs?.active === "false") continue;

        const prize = Number(attrs?.prize ?? item?.prize ?? 0) || 0;
        if (prize <= 0) continue;

        const bonusDocId = item.documentId ?? item.id;

        const data: Record<string, unknown> = { active: false, issueAt: nowIso };
        if (dealDocumentId) {
          // manyToOne: в Strapi 5 надёжнее короткий формат (documentId строкой)
          data.deal = dealDocumentId;
        }

        await strapiAxios.put(
          `${base}/api/gala-bonuses/${String(bonusDocId)}`,
          { data },
          { headers }
        );
        break;
      }
    }

    return NextResponse.json({ status: "ok", message: "complete" });
  } catch (e: any) {
    console.error("pay/complete error:", e?.response?.status, e?.response?.config?.url, e?.response?.data ?? e);
    return NextResponse.json({ status: "error", message: e?.message ?? "server_error" }, { status: 500 });
  }
}