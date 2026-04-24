"use server";

import { cookies } from "next/headers";
import { apiGet } from "@/app/api/fetcher";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { getProperties, getPropertyByDocumentId } from "@/app/api/properties/getProperties";
import type { RealEstateType } from "@/types/flat";

interface TypeConfigEntry {
  apiPath: string;
  statusField: string;
  numberField: string;
  relation: string;
  supportsMedia: boolean;
}

const TYPE_CONFIG: Record<RealEstateType, TypeConfigEntry> = {
  property: {
    apiPath: "/api/properties",
    statusField: "propertyStatus",
    numberField: "apartmentNumber",
    relation: "property",
    supportsMedia: true,
  },
  commerce: {
    apiPath: "/api/commerces",
    statusField: "commerceStatus",
    numberField: "commerceNumber",
    relation: "commerce",
    supportsMedia: true,
  },
  parking: {
    apiPath: "/api/parkings",
    statusField: "parkingStatus",
    numberField: "parkingNumber",
    relation: "parking",
    supportsMedia: false,
  },
  pantry: {
    apiPath: "/api/pantrys",
    statusField: "pantryStatus",
    numberField: "numberPantry",
    relation: "pantry",
    supportsMedia: false,
  },
};

/** Статусы, при которых сделка считается активной (синхронизировано с /api/deals/start) */
const ACTIVE_DEAL_STATUSES = [
  "Бронь",
  "Ожидания оплаты",
  "Оплачено",
  "Согласование РОП",
  "Ожидания договора",
  "Договор подписан",
];

/** Нормализация данных о квартире/коммерции/паркинге/кладовой для детальной страницы */
export interface PropertyDetailPayload {
  id: number;
  documentId: string;
  projectDocumentId?: string;
  room: number;
  house: number;
  totalArea: number;
  priceCheckmate: number;
  priceM2Checkmate: number;
  floor: number;
  section: string;
  entrance: number;
  projectName: string;
  district: string;
  complexAddress: string;
  complexDueDate: string;
  complexClass?: string;
  complexGenPlanImage?: string;
  images: string[];
  platformPlanImages: string[];
  windPlanImages: string[];
  tags: string[];
  propertyStatus: string;
  apartmentNumber: number | string;
  saleStatus?: string;
  sunshine?: string;
  fullPaymentDiscount?: number;
  paymentConditions?: any[];
  floorGroup?: string;
}

export interface ActiveDealStatus {
  hasActiveDeal: boolean;
  dealDocumentId: string | null;
  canResume: boolean;
}

export interface SimilarPropertyItem {
  id: number;
  documentId: string;
  projectName: string;
  complexAddress: string;
  priceCheckmate: number;
  priceM2Checkmate: number;
  tags: string[];
  images: string[];
  platformPlanImages: string[];
  room: number;
  totalArea: number;
  floor: number;
}

export interface FlatDetailBootstrap {
  property: PropertyDetailPayload | null;
  activeDeal: ActiveDealStatus;
  similar: SimilarPropertyItem[];
}

/** Получить детальные данные объекта. Для жилья ‑ через полный маппер getPropertyByDocumentId; для прочих типов ‑ напрямую из Strapi. */
export async function fetchPropertyDetail(
  id: string,
  type: RealEstateType,
): Promise<PropertyDetailPayload | null> {
  if (!id) return null;

  if (type === "property") {
    const detail = await getPropertyByDocumentId(id);
    if (!detail) return null;
    return {
      id: Number(detail.id ?? 0),
      documentId: detail.documentId != null ? String(detail.documentId) : id,
      projectDocumentId: detail.projectDocumentId,
      room: Number(detail.room ?? 0),
      house: Number(detail.house ?? 0),
      totalArea: Number(detail.totalArea ?? 0),
      priceCheckmate: Number(detail.priceCheckmate ?? 0),
      priceM2Checkmate: Number(detail.priceM2Checkmate ?? 0),
      floor: Number(detail.floor ?? 0),
      section: String(detail.section ?? "0"),
      entrance: Number(detail.entrance ?? 0),
      projectName: detail.projectName ?? "",
      district: detail.district ?? "",
      complexAddress: detail.complexAddress ?? "",
      complexDueDate: detail.complexDueDate ?? "",
      complexClass: detail.complexClass ?? "",
      complexGenPlanImage: detail.complexGenPlanImage ?? "",
      images: Array.isArray(detail.images) ? detail.images : [],
      platformPlanImages: Array.isArray(detail.platformPlanImages) ? detail.platformPlanImages : [],
      windPlanImages: Array.isArray(detail.windPlanImages) ? detail.windPlanImages : [],
      tags: Array.isArray(detail.tags) ? detail.tags : [],
      propertyStatus: detail.propertyStatus ?? "свободно",
      apartmentNumber: detail.apartmentNumber ?? detail.id ?? 0,
      saleStatus: detail.saleStatus,
      sunshine: detail.sunshine ?? "",
      fullPaymentDiscount: detail.fullPaymentDiscount,
      paymentConditions: detail.paymentConditions ?? [],
      floorGroup: detail.floorGroup,
    };
  }

  const cfg = TYPE_CONFIG[type];
  const raw = await apiGet(
    {
      path: cfg.apiPath,
      params: {
        "filters[documentId][$eq]": String(id),
        "filters[project][publishedAt][$notNull]": "true",
        "pagination[pageSize]": "1",
        "populate[project][fields][0]": "projectName",
        "populate[project][fields][1]": "district",
        "populate[project][fields][2]": "documentId",
        "populate[project][populate][complexes][fields][0]": "complexAddress",
        "populate[project][populate][complexes][fields][1]": "complexDueDate",
        "populate[paymentConditions][populate]": "paymentCondition",
        ...(cfg.supportsMedia
          ? {
              "populate[plan][fields][0]": "url",
              "populate[platformPlan][fields][0]": "url",
              "populate[windPlan][fields][0]": "url",
            }
          : {}),
      },
    },
    true,
  );

  const item = Array.isArray((raw as any)?.data) ? (raw as any).data[0] : null;
  if (!item) return null;

  const plan = Array.isArray(item?.plan) ? item.plan : item?.plan ? [item.plan] : [];
  const platform = Array.isArray(item?.platformPlan) ? item.platformPlan : item?.platformPlan ? [item.platformPlan] : [];
  const wind = Array.isArray(item?.windPlan) ? item.windPlan : item?.windPlan ? [item.windPlan] : [];
  const complexes = item?.project?.complexes;
  const complexAddress = Array.isArray(complexes)
    ? complexes[0]?.complexAddress ?? ""
    : complexes?.complexAddress ?? "";
  const complexDueDate = Array.isArray(complexes)
    ? complexes[0]?.complexDueDate ?? ""
    : complexes?.complexDueDate ?? "";
  const proj = item?.project as { documentId?: string; data?: { documentId?: string } } | undefined;
  const projectDocumentId =
    proj?.documentId != null
      ? String(proj.documentId)
      : proj?.data?.documentId != null
        ? String(proj.data.documentId)
        : undefined;

  return {
    id: Number(item.id ?? 0),
    documentId: item.documentId != null ? String(item.documentId) : String(id),
    projectDocumentId,
    room: Number(item.room ?? 0),
    house: Number(item.house ?? 0),
    totalArea: Number(item.totalArea ?? 0),
    priceCheckmate: Number(item.priceCheckmate ?? 0),
    priceM2Checkmate: Number(item.priceM2Checkmate ?? 0),
    floor: Number(item.floor ?? 0),
    section: String(item.section ?? "0"),
    entrance: Number(item.entrance ?? 0),
    projectName: item?.project?.projectName ?? "",
    district: item?.project?.district ?? "",
    complexAddress,
    complexDueDate,
    images: plan.map((p: any) => p?.url).filter(Boolean),
    platformPlanImages: platform.map((p: any) => p?.url).filter(Boolean),
    windPlanImages: wind.map((p: any) => p?.url).filter(Boolean),
    tags: Array.isArray(item?.tags) ? item.tags : [],
    propertyStatus: item?.[cfg.statusField] ?? "свободно",
    apartmentNumber: item?.[cfg.numberField] ?? item?.id ?? 0,
    saleStatus: item?.saleStatus,
    paymentConditions: item?.paymentConditions ?? [],
  };
}

/** Проверить, есть ли по объекту активная сделка. Fallback при ошибках — hasActiveDeal=true, чтобы не разрешить бронирование случайно. */
export async function fetchActiveDealStatus(
  id: string,
  type: RealEstateType,
): Promise<ActiveDealStatus> {
  if (!id) return { hasActiveDeal: true, dealDocumentId: null, canResume: false };

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.property;

  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    const tokenPayload = access ? verifyAccessToken(access) : null;

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const buildUrl = (propertyFilter: string) =>
      `${base}/api/deals` +
      `?${propertyFilter}` +
      `&sort[0]=createdAt:desc` +
      `&pagination[pageSize]=25` +
      `&populate[customer][fields][0]=id`;

    const byDocument = await strapiAxios.get(
      buildUrl(`filters[${cfg.relation}][documentId][$eq]=${encodeURIComponent(id)}`),
      { headers },
    );
    let list: any[] = (byDocument.data as any)?.data ?? [];
    if (!Array.isArray(list)) list = [];

    if (list.length === 0) {
      const propRes = await strapiAxios.get(
        `${base}${cfg.apiPath}?filters[documentId][$eq]=${encodeURIComponent(id)}&pagination[pageSize]=1&fields[0]=id`,
        { headers },
      );
      const propList = (propRes.data as any)?.data ?? [];
      const prop = Array.isArray(propList) ? propList[0] : null;
      const propInternalId = prop?.id ?? prop?.attributes?.id ?? null;
      if (propInternalId != null) {
        const byInternal = await strapiAxios.get(
          buildUrl(`filters[${cfg.relation}][id][$eq]=${encodeURIComponent(propInternalId)}`),
          { headers },
        );
        list = (byInternal.data as any)?.data ?? [];
        if (!Array.isArray(list)) list = [];
      }
    }

    const deal =
      list.find((d: any) => ACTIVE_DEAL_STATUSES.includes(d?.dealStatus ?? d?.attributes?.dealStatus ?? "")) ?? null;
    const hasActiveDeal = deal != null;
    const dealDocumentId = hasActiveDeal ? deal?.documentId ?? deal?.id ?? null : null;
    const dealCustomerId = deal?.customer?.id ?? deal?.attributes?.customer?.id ?? null;
    const canResume = Boolean(
      tokenPayload?.sub && dealCustomerId && Number(dealCustomerId) === Number(tokenPayload.sub),
    );

    return {
      hasActiveDeal,
      dealDocumentId: dealDocumentId ? String(dealDocumentId) : null,
      canResume: hasActiveDeal ? canResume : false,
    };
  } catch (err: any) {
    console.error("[fetchActiveDealStatus]", err?.response?.data ?? err);
    return { hasActiveDeal: true, dealDocumentId: null, canResume: false };
  }
}

/** Подобрать похожие объекты: тот же ЖК, близкие по площади/цене; для жилья ‑ той же комнатности. */
export async function fetchSimilarProperties(
  input: { id: string; type: RealEstateType; limit?: number },
  currentDetail?: PropertyDetailPayload | null,
): Promise<SimilarPropertyItem[]> {
  const { id, type } = input;
  const limit = Math.min(Math.max(Number(input.limit ?? 3) || 3, 1), 8);
  if (!id) return [];

  try {
    const current = currentDetail ?? (await fetchPropertyDetail(id, type));
    if (!current) return [];

    const currentDocumentId = String(current.documentId ?? "");
    const currentArea = Number(current.totalArea ?? 0);
    const currentPrice = Number(current.priceCheckmate ?? 0);
    const minArea = currentArea > 0 ? Math.max(0, Math.round(currentArea * 0.85)) : null;
    const maxArea = currentArea > 0 ? Math.round(currentArea * 1.15) : null;
    const minPrice = currentPrice > 0 ? Math.max(0, Math.round(currentPrice * 0.85)) : null;
    const maxPrice = currentPrice > 0 ? Math.round(currentPrice * 1.15) : null;

    if (type === "property") {
      const result = await getProperties(
        {
          project: current.projectName || undefined,
          roomCount: current.room > 0 ? String(current.room) : undefined,
          areaRange: minArea !== null && maxArea !== null ? [minArea, maxArea] : undefined,
          priceRange: minPrice !== null && maxPrice !== null ? [minPrice, maxPrice] : undefined,
        },
        { page: 1, pageSize: 12, light: false, allStatuses: false },
      );
      const rows = Array.isArray((result as any)?.data)
        ? (result as any).data
        : Array.isArray(result)
          ? result
          : [];
      return mapSimilarRows(rows, currentDocumentId, limit);
    }

    const cfg = TYPE_CONFIG[type];
    const params: Record<string, string> = {
      "filters[project][publishedAt][$notNull]": "true",
      [`filters[${cfg.statusField}][$eq]`]: "свободно",
      "pagination[page]": "1",
      "pagination[pageSize]": "12",
      "populate[project][fields][0]": "projectName",
      "populate[project][populate][complexes][fields][0]": "complexAddress",
      ...(cfg.supportsMedia
        ? {
            "populate[plan][fields][0]": "url",
            "populate[platformPlan][fields][0]": "url",
          }
        : {}),
    };
    if (current.projectName) {
      params["filters[project][projectName][$eq]"] = current.projectName.trim();
    }
    if (type !== "parking" && minArea !== null && maxArea !== null) {
      params["filters[totalArea][$gte]"] = String(minArea);
      params["filters[totalArea][$lte]"] = String(maxArea);
    }
    if (minPrice !== null && maxPrice !== null) {
      params["filters[priceCheckmate][$gte]"] = String(minPrice);
      params["filters[priceCheckmate][$lte]"] = String(maxPrice);
    }

    const raw = await apiGet({ path: cfg.apiPath, params }, true);
    const rows = Array.isArray((raw as any)?.data) ? (raw as any).data : [];
    const mapped = rows.map((item: any) => {
      const plan = Array.isArray(item?.plan) ? item.plan : item?.plan ? [item.plan] : [];
      const platform = Array.isArray(item?.platformPlan) ? item.platformPlan : item?.platformPlan ? [item.platformPlan] : [];
      return {
        id: Number(item?.id ?? 0),
        documentId: String(item?.documentId ?? item?.id ?? ""),
        projectName: String(item?.project?.projectName ?? ""),
        complexAddress: String(item?.project?.complexes?.[0]?.complexAddress ?? ""),
        priceCheckmate: Number(item?.priceCheckmate ?? 0),
        priceM2Checkmate: Number(item?.priceM2Checkmate ?? 0),
        tags: Array.isArray(item?.tags) ? item.tags : [],
        images: plan.map((p: any) => p?.url).filter(Boolean),
        platformPlanImages: platform.map((p: any) => p?.url).filter(Boolean),
        room: Number(item?.room ?? 0),
        totalArea: Number(item?.totalArea ?? 0),
        floor: Number(item?.floor ?? 0),
      } satisfies SimilarPropertyItem;
    });
    return mapped
      .filter((row: SimilarPropertyItem) => row.documentId && row.documentId !== currentDocumentId)
      .slice(0, limit);
  } catch (error) {
    console.error("[fetchSimilarProperties]", error);
    return [];
  }
}

function mapSimilarRows(rows: any[], currentDocumentId: string, limit: number): SimilarPropertyItem[] {
  return rows
    .filter((row: any) => String(row?.documentId ?? "") !== currentDocumentId)
    .slice(0, limit)
    .map((row: any) => ({
      id: Number(row?.id ?? 0),
      documentId: String(row?.documentId ?? row?.id ?? ""),
      projectName: String(row?.projectName ?? ""),
      complexAddress: String(row?.complexAddress ?? row?.district ?? ""),
      priceCheckmate: Number(row?.priceCheckmate ?? 0),
      priceM2Checkmate: Number(row?.priceM2Checkmate ?? 0),
      tags: Array.isArray(row?.tags) ? row.tags : [],
      images: Array.isArray(row?.images) ? row.images : [],
      platformPlanImages: Array.isArray(row?.platformPlanImages) ? row.platformPlanImages : [],
      room: Number(row?.room ?? 0),
      totalArea: Number(row?.totalArea ?? 0),
      floor: Number(row?.floor ?? 0),
    }))
    .filter((row) => row.documentId);
}

/** Главный аггрегатор: всё, что нужно странице `flats/[id]`, `commerce/[id]`, `parking/[id]`, `pantry/[id]`. */
export async function fetchFlatDetailBootstrap(
  id: string,
  type: RealEstateType,
): Promise<FlatDetailBootstrap> {
  const [property, activeDeal] = await Promise.all([
    fetchPropertyDetail(id, type),
    fetchActiveDealStatus(id, type),
  ]);
  const similar = property ? await fetchSimilarProperties({ id, type, limit: 3 }, property) : [];
  return { property, activeDeal, similar };
}
