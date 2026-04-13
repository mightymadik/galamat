import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

/**
 * GET /api/manager/agreements
 * Список сделок с информацией о договоре (подписан/дата) для раздела «Договора».
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const origin = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const originHeaders = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, origin, originHeaders);
    const roleLower = String(effectiveRole || "").toLowerCase();
    const isManager = roleLower === "manager" || roleLower === "admin" || roleLower === "rop";
    const isLawyer = roleLower === "lawyer";
    const isAdmin = roleLower === "admin";
    if (!isManager && !isLawyer) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const managerId = payload.sub;

    const baseDealsQuery =
      `sort[0]=createdAt:desc` +
      `&pagination[pageSize]=500` +
      `&populate[property][fields][0]=documentId&populate[property][fields][1]=apartmentNumber` +
      `&populate[property][populate][project][fields][0]=projectName` +
      `&populate[commerce][fields][0]=documentId&populate[commerce][fields][1]=commerceNumber` +
      `&populate[commerce][populate][project][fields][0]=projectName` +
      `&populate[parking][fields][0]=documentId&populate[parking][fields][1]=parkingNumber` +
      `&populate[parking][populate][project][fields][0]=projectName` +
      `&populate[pantry][fields][0]=documentId&populate[pantry][fields][1]=numberPantry` +
      `&populate[pantry][populate][project][fields][0]=projectName` +
      `&populate[customer][fields][0]=name&populate[customer][fields][1]=surname&populate[customer][fields][2]=phone` +
      `&populate[manager][fields][0]=name&populate[manager][fields][1]=surname` +
      `&fields[0]=documentId&fields[1]=dealStatus&fields[2]=createdAt`;

    const dealsUrl = isAdmin || isLawyer
      ? `${base}/api/deals?${baseDealsQuery}`
      : `${base}/api/deals?filters[manager][id][$eq]=${encodeURIComponent(managerId)}&${baseDealsQuery}`;

    const dealsRes = await strapiAxios.get(dealsUrl, { headers });
    let rawDeals: any[] = (dealsRes.data as any)?.data ?? [];
    if (!Array.isArray(rawDeals)) rawDeals = [];

    if (rawDeals.length === 0 && !isAdmin && !isLawyer) {
      const byDocIdUrl =
        `${base}/api/deals?filters[manager][documentId][$eq]=${encodeURIComponent(String(managerId))}&${baseDealsQuery}`;
      const res2 = await strapiAxios.get(byDocIdUrl, { headers }).catch(() => ({ data: {} }));
      rawDeals = (res2.data as any)?.data ?? [];
      if (!Array.isArray(rawDeals)) rawDeals = [];
    }

    const dealIds = rawDeals.map((d: any) => d?.documentId ?? d?.id).filter(Boolean);
    const saByDeal: Record<string, { signed: boolean; signedAt: string | null }> = {};
    if (dealIds.length > 0) {
      const inParams = dealIds
        .slice(0, 100)
        .map((id, i) => `filters[deal][documentId][$in][${i}]=${encodeURIComponent(id)}`)
        .join("&");
      const saRes = await strapiAxios.get(
        `${base}/api/signed-agreements?${inParams}` +
          `&sort[0]=createdAt:desc` +
          `&pagination[pageSize]=500` +
          `&fields[0]=signed&fields[1]=signedAt` +
          `&populate[deal][fields][0]=documentId`,
        { headers }
      ).catch(() => ({ data: { data: [] } }));
      const saList: any[] = (saRes.data as any)?.data ?? [];
      for (const sa of saList) {
        const dealRel = sa?.deal ?? sa?.attributes?.deal;
        const dealData = (dealRel as any)?.data ?? dealRel;
        const docId = dealData?.documentId ?? dealData?.id;
        if (docId && !saByDeal[docId]) {
          saByDeal[docId] = {
            signed: sa?.signed ?? sa?.attributes?.signed ?? false,
            signedAt: sa?.signedAt ?? sa?.attributes?.signedAt ?? null,
          };
        }
      }
    }

    const agreements = rawDeals.map((d: any) => {
      const docId = String(d?.documentId ?? d?.id ?? "");
      const property = (d?.property ?? d?.attributes?.property) as any;
      const commerce = (d?.commerce ?? d?.attributes?.commerce) as any;
      const parking = (d?.parking ?? d?.attributes?.parking) as any;
      const pantry = (d?.pantry ?? d?.attributes?.pantry) as any;
      const p = (property?.data ?? property) || null;
      const c = (commerce?.data ?? commerce) || null;
      const pk = (parking?.data ?? parking) || null;
      const pt = (pantry?.data ?? pantry) || null;
      const entityType: "property" | "commerce" | "parking" | "pantry" =
        p?.documentId ? "property" : c?.documentId ? "commerce" : pk?.documentId ? "parking" : "pantry";
      const entity = entityType === "property" ? p : entityType === "commerce" ? c : entityType === "parking" ? pk : pt;
      const cust = d?.customer ?? d?.attributes?.customer;
      const custData = (cust as any)?.data ?? cust;
      const name = custData?.name ?? custData?.attributes?.name ?? "";
      const surname = custData?.surname ?? custData?.attributes?.surname ?? "";
      const clientName = [surname, name].filter(Boolean).join(" ").trim() || "—";
      const mgr = d?.manager ?? d?.attributes?.manager;
      const mgrData = (mgr as any)?.data ?? mgr;
      const mgrName = mgrData?.name ?? mgrData?.attributes?.name ?? "";
      const mgrSurname = mgrData?.surname ?? mgrData?.attributes?.surname ?? "";
      const managerDisplayName = [mgrSurname, mgrName].filter(Boolean).join(" ").trim() || "—";
      const projectName = entity?.project?.projectName ?? entity?.project?.attributes?.projectName ?? "";
      const apartmentNumber =
        entityType === "property"
          ? (entity?.apartmentNumber ?? entity?.attributes?.apartmentNumber ?? "")
          : entityType === "commerce"
            ? (entity?.commerceNumber ?? entity?.attributes?.commerceNumber ?? "")
            : entityType === "parking"
              ? (entity?.parkingNumber ?? entity?.attributes?.parkingNumber ?? "")
              : (entity?.numberPantry ?? entity?.attributes?.numberPantry ?? "");
      const sa = saByDeal[docId] ?? null;
      return {
        dealDocumentId: docId,
        dealStatus: d?.dealStatus ?? d?.attributes?.dealStatus ?? "",
        createdAt: d?.createdAt ?? d?.attributes?.createdAt ?? null,
        customer: { name, surname, displayName: clientName },
        manager: managerDisplayName ? { displayName: managerDisplayName } : null,
        property: {
          projectName,
          apartmentNumber,
          type: entityType,
          typeLabel: entityType === "commerce" ? "Коммерция" : entityType === "parking" ? "Паркинг" : entityType === "pantry" ? "Кладовка" : "Квартира",
        },
        signedAgreement: sa ? { signed: sa.signed, signedAt: sa.signedAt } : null,
      };
    });

    return NextResponse.json({ agreements });
  } catch (err: any) {
    console.error("[manager/agreements]", err?.response?.data ?? err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
