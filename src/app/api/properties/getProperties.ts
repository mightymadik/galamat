"use server";
import { apiGet } from "@/app/api/fetcher";
import { getLocale } from "@/lib/getLocale";

const BACKEND_URL = process.env.STRAPI_URL?.replace(/\/$/, "") || "";

/** Кэш метаданных фильтров: не грузить все 280 квартир при каждом открытии страницы */
const METADATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
let metadataCache: { data: PropertyFiltersMetadata; expiresAt: number } | null = null;

export interface PropertyFilters {
  priceRange?: [number, number];
  pricePerM2Range?: [number, number];
  areaRange?: [number, number];
  entranceRange?: [number, number];
  roomCount?: string | string[]; // одна или несколько комнат
  district?: string;
  project?: string; // название ЖК (projectName)
  tags?: string[];
  /** Filter by property ids (e.g. for favorites) */
  ids?: number[];
}

export interface PropertyFiltersMetadata {
  priceRange: { min: number; max: number };
  pricePerM2Range: { min: number; max: number };
  areaRange: { min: number; max: number };
  entranceRange: { min: number; max: number };
  roomCount: string[];
  districts: string[];
  complexes: string[];
  totalCount: number;
}

export interface GetPropertiesOptions {
  /** Режим списка: не подгружать планировки (plan/platformPlan), снижает нагрузку на бэкенд */
  light?: boolean;
  /** Страница для пагинации (1-based) */
  page?: number;
  /** Размер страницы */
  pageSize?: number;
  /** Для шахматки: загружать все квартиры (любой статус), не только «свободно» */
  allStatuses?: boolean;
}

export async function getProperties(filters?: PropertyFilters, options?: GetPropertiesOptions) {
  try {
    const locale = await getLocale();
    const light = options?.light === true;
    const usePagination = options?.page != null && options?.pageSize != null && options.pageSize > 0;
    const allStatuses = options?.allStatuses === true;

    const params: Record<string, string> = {
      "fields[0]": "room",
      "fields[1]": "totalArea",
      "fields[2]": "priceCheckmate",
      "fields[3]": "priceM2Checkmate",
      "fields[4]": "floor",
      "fields[5]": "section",
      "fields[6]": "entrance",
      "fields[7]": "propertyStatus",
      "fields[8]": "saleStatus",
      "fields[9]": "apartmentNumber",
      "fields[10]": "numberApartmentFloor",
      "fields[11]": "documentId",
      "fields[12]": "sunshine",

      "populate[project][fields][0]": "projectName",
      "populate[project][fields][1]": "district",
      "populate[project][fields][2]": "documentId",
      "populate[project][populate][complexes][fields][0]": "complexAddress",
      "populate[project][populate][complexes][fields][1]": "locale",
      "populate[project][populate][complexes][fields][2]": "complexGenPlan",
      "populate[paymentConditions][fields][0]": "paymentMethod",
    };

    // Только свободные и в продаже: при allStatuses (шахматка) не фильтруем по статусу; иначе — только «свободно» / «открыто»
    if (!allStatuses) {
      params["filters[propertyStatus][$eq]"] = "свободно";
      params["filters[saleStatus][$eq]"] = "открыто";
    }

    // Планировки: при пагинации (список/сетка) — только url, без всех форматов; иначе полная подгрузка (страница квартиры)
    if (light) {
      // без планировок
    } else if (usePagination) {
      params["populate[plan][fields][0]"] = "url";
      params["populate[platformPlan][fields][0]"] = "url";
    } else {
      params["populate[plan][populate]"] = "*";
      params["populate[platformPlan][populate]"] = "*";
    }

    // Фильтр по цене
    if (filters?.priceRange) {
      params["filters[priceCheckmate][$gte]"] = String(filters.priceRange[0]);
      params["filters[priceCheckmate][$lte]"] = String(filters.priceRange[1]);
    }

    // Фильтр по цене за м²
    if (filters?.pricePerM2Range) {
      params["filters[priceM2Checkmate][$gte]"] = String(filters.pricePerM2Range[0]);
      params["filters[priceM2Checkmate][$lte]"] = String(filters.pricePerM2Range[1]);
    }

    // Фильтр по площади
    if (filters?.areaRange) {
      params["filters[totalArea][$gte]"] = String(filters.areaRange[0]);
      params["filters[totalArea][$lte]"] = String(filters.areaRange[1]);
    }

    // Фильтр по подъезду
    if (filters?.entranceRange) {
      params["filters[entrance][$gte]"] = String(filters.entranceRange[0]);
      params["filters[entrance][$lte]"] = String(filters.entranceRange[1]);
    }

    // Фильтр по комнатности (одна или несколько)
    const roomCount = filters?.roomCount;
    if (roomCount != null && roomCount !== "") {
      const rooms = Array.isArray(roomCount) ? roomCount : [roomCount];
      const valid = rooms.map(String).filter(Boolean);
      if (valid.length === 1) {
        params["filters[room][$eq]"] = valid[0];
      } else if (valid.length > 1) {
        valid.forEach((r, i) => {
          params[`filters[room][$in][${i}]`] = r;
        });
      }
    }

    // Фильтр по району
    if (filters?.district && filters.district !== "Все") {
      params["filters[project][district][$eq]"] = filters.district;
    }

    // Фильтр по ЖК (projectName); trim чтобы "Gala Next " совпадал с "Gala Next"
    if (filters?.project && filters.project !== "Все") {
      params["filters[project][projectName][$eq]"] = filters.project.trim();
    }

    // Фильтр по id (например для избранного)
    if (filters?.ids && filters.ids.length > 0) {
      filters.ids.forEach((id, i) => {
        params[`filters[id][$in][${i}]`] = String(id);
      });
    }

    // Фильтр по тегам программ оплаты (из связи paymentConditions.paymentMethod)
    if (filters?.tags && filters.tags.length > 0) {
      const methods = filters.tags.filter((t) => t && String(t).trim());
      if (methods.length === 1) {
        params["filters[paymentConditions][paymentMethod][$eq]"] = methods[0];
      } else if (methods.length > 1) {
        methods.forEach((m, i) => {
          params[`filters[$or][${i}][paymentConditions][paymentMethod][$eq]`] = m;
        });
      }
    }

    // Вспомогательная функция маппинга одной записи
    const mapItem = (item: any) => {
      const planImages = light
        ? []
        : Array.isArray(item.plan)
          ? item.plan.map((img: any) => {
            const url = img.formats?.large?.url || img.formats?.medium?.url || img.formats?.small?.url || img.url;
            return url ? `${BACKEND_URL}${url}` : null;
          }).filter(Boolean)
          : item.plan
            ? [item.plan.formats?.large?.url || item.plan.formats?.medium?.url || item.plan.formats?.small?.url || item.plan.url]
              .map((url: string) => url ? `${BACKEND_URL}${url}` : null)
              .filter(Boolean)
            : [];

      const platformPlanImages = light
        ? []
        : Array.isArray(item.platformPlan)
          ? item.platformPlan.map((img: any) => {
            const url = img.formats?.large?.url || img.formats?.medium?.url || img.formats?.small?.url || img.url;
            return url ? `${BACKEND_URL}${url}` : null;
          }).filter(Boolean)
          : item.platformPlan
            ? [item.platformPlan.formats?.large?.url || item.platformPlan.formats?.medium?.url || item.platformPlan.formats?.small?.url || item.platformPlan.url]
              .map((url: string) => url ? `${BACKEND_URL}${url}` : null)
              .filter(Boolean)
            : [];

      const tags: string[] = [];
      const pcList = Array.isArray(item.paymentConditions)
        ? item.paymentConditions
        : Array.isArray(item.paymentConditions?.data)
          ? item.paymentConditions.data
          : [];
      for (const pc of pcList) {
        const method = pc?.paymentMethod ?? pc?.attributes?.paymentMethod ?? "";
        if (method && !tags.includes(method)) tags.push(String(method).trim());
      }

      let complexAddress = "";
      const complexes = item.project?.complexes;
      if (Array.isArray(complexes) && complexes.length > 0) {
        const complexWithLocale = complexes.find((c: any) => String(c.locale) === String(locale));
        complexAddress = complexWithLocale?.complexAddress || complexes[0]?.complexAddress || "";
      } else if (complexes) {
        complexAddress = complexes.complexAddress || "";
      }

      const complexWithLocale = Array.isArray(complexes)
        ? complexes.find((c: any) => String(c.locale) === String(locale))
        : null;

      const complexGenPlanUrl =
        complexWithLocale?.complexGenPlan?.url ||
        (Array.isArray(complexes) ? complexes[0]?.complexGenPlan?.url : complexes?.complexGenPlan?.url) ||
        "";

      const complexGenPlanImage = complexGenPlanUrl ? `${BACKEND_URL}${complexGenPlanUrl}` : "";

      // section в Strapi может быть числом или relation (объект) — всегда отдаём строку-число
      const rawSection = item.section;
      const sectionStr =
        rawSection != null && typeof rawSection === "object"
          ? String(rawSection.id ?? rawSection.number ?? rawSection.name ?? "0")
          : (rawSection != null ? String(rawSection) : "0");

      const projectDocumentId = item.project?.documentId != null ? String(item.project.documentId) : undefined;

      return {
        id: item.id,
        documentId: item.documentId,
        room: item.room || 0,
        totalArea: parseFloat(item.totalArea) || 0,
        priceCheckmate: parseInt(item.priceCheckmate) || 0,
        priceM2Checkmate: parseInt(item.priceM2Checkmate) || 0,
        floor: parseInt(item.floor) || 0,
        section: sectionStr || "0",
        entrance: parseInt(item.entrance) || 0,
        projectName: item.project?.projectName || "",
        district: item.project?.district || "",
        complexAddress,
        images: planImages,
        platformPlanImages,
        tags,
        propertyStatus: item.propertyStatus || "свободно",
        apartmentNumber: item.apartmentNumber != null ? item.apartmentNumber : item.id,
        numberApartmentFloor: item.numberApartmentFloor != null ? item.numberApartmentFloor : 0,
        complexGenPlanImage,
        sunshine: item.sunshine || "",
        projectDocumentId,
        saleStatus: item.saleStatus,
      };
    };

    // Пагинация: один запрос к Strapi, возвращаем одну страницу
    if (usePagination) {
      const paginationParams = {
        ...params,
        "pagination[page]": String(options!.page),
        "pagination[pageSize]": String(options!.pageSize),
      };
      const res = await apiGet({ path: "/api/properties", params: paginationParams }, true);
      const propertiesData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
            ? res
            : [];
      const pagination = res?.meta?.pagination || res?.data?.meta?.pagination;
      const total = pagination?.total ?? propertiesData.length;
      const pageCount = pagination?.pageCount ?? 1;
      if (propertiesData.length === 0 && Object.keys(params).filter((k) => k.startsWith("filters")).length > 0) {
        console.log("[flats getProperties] pagination: 0 items, applied filters:", Object.keys(params).filter((k) => k.startsWith("filters")));
      }

      return {
        data: propertiesData.map(mapItem),
        meta: {
          total: Number(total),
          page: options!.page!,
          pageSize: options!.pageSize!,
          pageCount: Number(pageCount),
        },
      };
    }

    // Без пагинации: забираем все страницы для шахматки (все квартиры ЖК, без искусственного лимита)
    const allProperties: any[] = [];
    let currentPage = 1;
    const strapiPageSize = 100;
    let totalExpected = 0;
    const MAX_PAGES = 200; // защита от бесконечного цикла (до 20 000 квартир на один ЖК)

    while (true) {
      const paginationParams = {
        ...params,
        "pagination[page]": String(currentPage),
        "pagination[pageSize]": String(strapiPageSize),
      };

      const res = await apiGet({ path: "/api/properties", params: paginationParams }, true);
      const propertiesData = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res)
            ? res
            : [];

      if (!Array.isArray(propertiesData) || propertiesData.length === 0) break;
      allProperties.push(...propertiesData);

      const pagination = res?.meta?.pagination || res?.data?.meta?.pagination;
      if (pagination?.total != null) totalExpected = Number(pagination.total);
      const totalPages = pagination?.pageCount ?? 1;

      if (totalExpected > 0 && allProperties.length >= totalExpected) break;
      if (currentPage >= totalPages) break;
      currentPage++;
      if (currentPage > MAX_PAGES) break;
    }

    if (allProperties.length === 0) {
      console.log("[flats getProperties] chessboard: 0 items, filters:", Object.keys(params).filter((k) => k.startsWith("filters")));
      return [];
    }
    return allProperties.map(mapItem);
  } catch (error) {
    console.error("[flats getProperties] error:", error);
    return [];
  }
}

/** Формат одной квартиры из API (для списка и для детальной страницы) */
export interface PropertyDetailItem {
  id: number;
  documentId?: string | number;
  room: number;
  totalArea: number;
  priceCheckmate: number;
  priceM2Checkmate: number;
  floor: number;
  section: string;
  entrance: number;
  projectName: string;
  projectDocumentId?: string;
  district: string;
  complexAddress: string;
  complexDueDate: string;
  images: string[];
  platformPlanImages: string[];
  tags: string[];
  propertyStatus: string;
  apartmentNumber: number | string;
  numberApartmentFloor: number;
  hypothec?: boolean;
  installment?: boolean;
  saleStatus?: string;
  complexClass: string;
  complexGenPlanImage: string;
  /** Hero-изображение ЖК из коллекции complex (complexHero.complexHeroImage) */
  complexHeroImage?: string;
  sunshine: string;
  house: number;
  /** Absolute discount for 100% payment (e.g. 351000 ₸). When set, UI shows crossed-out original price. */
  fullPaymentDiscount?: number;
  /** Условия оплат, привязанные к этой квартире (из программы оплат). */
  paymentConditions?: PaymentConditionForFlat[];
  planView?: string;
  floorGroup?: string;
  loggiaView?: string;
  location?: string;
  riseRow?: number;
  windowView?: string;
}

/** Одно условие оплаты для отображения на странице квартиры */
export interface PaymentConditionForFlat {
  documentId?: string;
  paymentMethod: string;
  paymentStatus?: string;
  validFrom?: string | null;
  validTo?: string | null;
  paymentCondition?: { downPayment?: string | null; raise?: number | null }[];
}

/** Маппер сырого объекта Strapi в PropertyDetailItem (для детальной страницы) */
function mapRawPropertyToDetail(item: any, locale: string): PropertyDetailItem {
  const getMediaUrl = (img: any): string | null => {
    if (!img) return null;
    const url = img.formats?.large?.url || img.formats?.medium?.url || img.formats?.small?.url || img.url;
    if (!url || typeof url !== "string") return null;
    const base = BACKEND_URL.replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return base ? `${base}${path}` : path;
  };
  const planImages = Array.isArray(item.plan)
    ? item.plan.map((img: any) => getMediaUrl(img)).filter(Boolean)
    : item.plan
      ? [getMediaUrl(item.plan)].filter(Boolean)
      : [];

  const platformPlanImages = Array.isArray(item.platformPlan)
    ? item.platformPlan.map((img: any) => getMediaUrl(img)).filter(Boolean)
    : item.platformPlan
      ? [getMediaUrl(item.platformPlan)].filter(Boolean)
      : [];

  const tags: string[] = [];
  const pcListDetail = Array.isArray(item.paymentConditions)
    ? item.paymentConditions
    : Array.isArray(item.paymentConditions?.data)
      ? item.paymentConditions.data
      : Array.isArray(item.paymentCondtions)
        ? item.paymentCondtions
        : Array.isArray(item.paymentCondtions?.data)
          ? item.paymentCondtions.data
          : [];
  for (const pc of pcListDetail) {
    const method = pc?.paymentMethod ?? pc?.attributes?.paymentMethod ?? "";
    if (method && !tags.includes(method)) tags.push(String(method).trim());
  }

  const project =
    item.project?.data ??
    item.project ??
    item.attributes?.project?.data ??
    item.attributes?.project;
  const complexDueDate = project?.complexes?.[0]?.complexDueDate ?? project?.attributes?.complexes?.data?.[0]?.complexDueDate ?? "";
  const complexClass = project?.complexes?.[0]?.complexClass ?? project?.attributes?.complexes?.data?.[0]?.complexClass ?? "";

  let complexAddress = "";
  const complexes = project?.complexes ?? project?.attributes?.complexes?.data ?? project?.attributes?.complexes ?? item.project?.complexes;
  if (Array.isArray(complexes) && complexes.length > 0) {
    const complexWithLocale = complexes.find((c: any) => String(c.locale) === String(locale));
    complexAddress = complexWithLocale?.complexAddress || complexes[0]?.complexAddress || "";
  } else if (complexes) {
    complexAddress = complexes.complexAddress || "";
  }

  const complexWithLocale = Array.isArray(complexes)
    ? complexes.find((c: any) => String(c.locale) === String(locale))
    : null;

  const complexGenPlanUrl =
    complexWithLocale?.complexGenPlan?.url ||
    (Array.isArray(complexes) ? complexes[0]?.complexGenPlan?.url : complexes?.complexGenPlan?.url) ||
    "";

  const complexGenPlanImage = complexGenPlanUrl ? `${BACKEND_URL}${complexGenPlanUrl}` : "";

  const complexHero = complexWithLocale?.complexHero ?? (Array.isArray(complexes) ? complexes[0]?.complexHero : complexes?.complexHero);
  const complexHeroImageUrl = complexHero?.complexHeroImage?.url ?? complexHero?.complexHeroImage?.data?.attributes?.url;
  const complexHeroImage = complexHeroImageUrl ? `${BACKEND_URL}${complexHeroImageUrl.startsWith("/") ? complexHeroImageUrl : `/${complexHeroImageUrl}`}` : "";

  const rawSection = item.section;
  const sectionStr =
    rawSection != null && typeof rawSection === "object"
      ? String(rawSection.id ?? rawSection.number ?? rawSection.name ?? "0")
      : (rawSection != null ? String(rawSection) : "0");

  const projectDocumentId =
    project?.documentId != null
      ? String(project.documentId)
      : project?.id != null
        ? String(project.id)
        : undefined;
  const projectName = project?.projectName ?? project?.attributes?.projectName ?? item.project?.projectName ?? "";
  const projectDistrict = project?.district ?? project?.attributes?.district ?? item.project?.district ?? "";
  return {
    id: item.id,
    documentId: item.documentId != null ? String(item.documentId) : undefined,
    room: item.room || 0,
    totalArea: parseFloat(item.totalArea) || 0,
    priceCheckmate: parseInt(item.priceCheckmate) || 0,
    priceM2Checkmate: parseInt(String(item.priceM2Checkmate), 10) || 0,
    floor: typeof item.floor === "number" ? item.floor : parseInt(String(item.floor), 10) || 0,
    section: sectionStr || "0",
    entrance: typeof item.entrance === "number" ? item.entrance : parseInt(String(item.entrance), 10) || 0,
    projectName: projectName || "",
    projectDocumentId,
    district: projectDistrict || "",
    complexAddress,
    complexDueDate,
    images: planImages,
    platformPlanImages,
    tags,
    propertyStatus: item.propertyStatus || "свободно",
    apartmentNumber: item.apartmentNumber != null ? item.apartmentNumber : item.id,
    numberApartmentFloor: item.numberApartmentFloor != null ? item.numberApartmentFloor : 0,
    hypothec: tags.includes("Ипотека"),
    installment: tags.includes("Рассрочка"),
    saleStatus: item.saleStatus,
    complexClass,
    complexGenPlanImage,
    complexHeroImage: complexHeroImage || undefined,
    sunshine: item.sunshine || "",
    fullPaymentDiscount:
      item.fullPaymentDiscount != null ? Number(item.fullPaymentDiscount) : undefined,
    house: item.house != null ? Number(item.house) : 0,
    paymentConditions: mapPaymentConditions(item.paymentConditions ?? item.paymentCondtions),
    planView: item.planView ?? undefined,
    floorGroup: item.floorGroup ?? undefined,
    loggiaView: item.loggiaView ?? undefined,
    location: item.location ?? undefined,
    riseRow: item.riseRow != null ? Number(item.riseRow) : undefined,
    windowView: item.windowView ?? undefined,
  };
}

function mapPaymentConditions(raw: any): PaymentConditionForFlat[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((c: any) => c && (c.paymentMethod || c.paymentStatus))
    .map((c: any) => ({
      documentId: c.documentId ?? undefined,
      paymentMethod: c.paymentMethod ?? "Installment",
      paymentStatus: c.paymentStatus ?? undefined,
      validFrom: c.validFrom ?? null,
      validTo: c.validTo ?? null,
      paymentCondition: Array.isArray(c.paymentCondition)
        ? c.paymentCondition.map((pc: any) => ({
          downPayment: pc?.downPayment ?? null,
          raise: pc?.raise != null ? Number(pc.raise) : null,
          paymentRule: pc?.paymentRule ?? undefined,
        }))
        : undefined,
    }));
}

/** Параметры запроса одной квартиры (популяции) */
const DETAIL_POPULATE_PARAMS: Record<string, string> = {
  "populate[plan][populate]": "*",
  "populate[platformPlan][populate]": "*",
  "populate[project][fields][0]": "documentId",
  "populate[project][fields][1]": "projectName",
  "populate[project][populate][complexes][fields][0]": "complexAddress",
  "populate[project][populate][complexes][fields][1]": "locale",
  "populate[project][populate][complexes][fields][2]": "complexDueDate",
  "populate[project][populate][complexes][fields][3]": "complexClass",
  "populate[project][populate][complexes][fields][4]": "complexGenPlan",
  "populate[project][populate][complexes][populate][complexHero][populate][complexHeroImage]": "true",
  "populate[paymentConditions][populate]": "paymentCondition",
};

/** Загрузить одну квартиру по documentId для детальной страницы (по ссылке /flats/[documentId]) */
export async function getPropertyByDocumentId(documentId: string | number): Promise<PropertyDetailItem | null> {
  try {
    const docId = typeof documentId === "string" ? documentId.trim() : String(documentId);
    if (!docId) return null;

    const locale = await getLocale();
    let item: any = null;

    // 1) Пробуем формат Strapi: GET /api/properties/:documentId → { data: property, meta }
    try {
      const pathRes = await apiGet(
        { path: `/api/properties/${encodeURIComponent(docId)}`, params: DETAIL_POPULATE_PARAMS },
        { skipCityFilter: true }
      );
      const pathData = pathRes?.data ?? pathRes;
      if (pathData && typeof pathData === "object" && !Array.isArray(pathData) && (pathData.id != null || pathData.documentId != null)) {
        item = pathData;
      }
    } catch {
      // path format не сработал, пробуем filter
    }

    // 2) Fallback: GET /api/properties?filters[documentId][$eq]=... → { data: [ property ] }
    if (!item || typeof item !== "object") {
      const params: Record<string, string> = {
        ...DETAIL_POPULATE_PARAMS,
        "filters[documentId][$eq]": docId,
      };
      const res = await apiGet({ path: "/api/properties", params }, { skipCityFilter: true });
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      item = list[0];
    }

    if (!item || typeof item !== "object") return null;

    // Условия оплаты: Strapi может вернуть paymentConditions или paymentCondtions
    let paymentCondtionsRaw = item.paymentConditions ?? item.paymentCondtions;
    try {
      const pcRes = await apiGet(
        {
          path: "/api/payment-conditions",
          params: {
            "filters[properties][documentId][$eq]": docId,
            "filters[paymentStatus][$eq]": "Активный",
            "populate[paymentCondition]": "*",
          },
        },
        true
      );
      const pcData = pcRes?.data ?? pcRes;
      const pcList = Array.isArray(pcData) ? pcData : Array.isArray(pcData?.data) ? pcData.data : [];
      if (pcList?.length) paymentCondtionsRaw = pcList;
    } catch {
      // оставляем из основного ответа, если есть
    }

    const itemWithPc = { ...item, paymentCondtions: paymentCondtionsRaw, paymentConditions: paymentCondtionsRaw };
    return mapRawPropertyToDetail(itemWithPc, locale);
  } catch (error) {
    return null;
  }
}

/** Загрузить одну квартиру по внутреннему id Strapi (для обратной совместимости) */
export async function getPropertyById(id: string | number): Promise<PropertyDetailItem | null> {
  try {
    const numericId = typeof id === "string" ? parseInt(id, 10) : id;
    if (!Number.isFinite(numericId)) return null;

    const locale = await getLocale();
    const res = await apiGet(
      { path: `/api/properties/${numericId}`, params: DETAIL_POPULATE_PARAMS },
      true
    );

    const item = res?.data ?? res;

    if (!item || typeof item !== "object") return null;

    return mapRawPropertyToDetail(item, locale);
  } catch (error) {
    return null;
  }
}

export async function getPropertyFiltersMetadata(): Promise<PropertyFiltersMetadata> {
  try {
    const now = Date.now();
    if (metadataCache && metadataCache.expiresAt > now) {
      return metadataCache.data;
    }

    // Базовые параметры для получения всех свойств без фильтров (кроме базовых)
    const params: Record<string, string> = {
      "fields[0]": "room",
      "fields[1]": "totalArea",
      "fields[2]": "priceCheckmate",
      "fields[3]": "priceM2Checkmate",
      "fields[4]": "entrance",

      "populate[project][fields][0]": "projectName",
      "populate[project][fields][1]": "district",
      // Без жёстких фильтров по статусу/цене, иначе метаданные пустые → фильтры и каталог без данных
    };

    // Получаем все данные с пагинацией
    const allProperties: any[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const paginationParams = {
        ...params,
        "pagination[page]": String(page),
        "pagination[pageSize]": String(pageSize),
      };

      const res = await apiGet({
        path: "/api/properties",
        params: paginationParams,
      }, true);

      const propertiesData = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data)
          ? res.data.data
          : (Array.isArray(res) ? res : []));

      if (!Array.isArray(propertiesData) || propertiesData.length === 0) {
        break;
      }

      allProperties.push(...propertiesData);

      const pagination = res?.meta?.pagination || res?.data?.meta?.pagination;
      const totalPages = pagination?.pageCount || 1;
      const currentPage = pagination?.page || page;

      if (currentPage >= totalPages || propertiesData.length < pageSize) {
        break;
      }

      page++;

      if (page > 1000) {
        console.warn("Reached pagination limit (1000 pages)");
        break;
      }
    }

    const totalCount = allProperties.length;
    if (allProperties.length === 0) {
      console.log("[flats getPropertyFiltersMetadata] 0 properties from Strapi → returning empty metadata");
      return {
        priceRange: { min: 0, max: 0 },
        pricePerM2Range: { min: 0, max: 0 },
        areaRange: { min: 0, max: 0 },
        entranceRange: { min: 0, max: 0 },
        roomCount: [],
        districts: [],
        complexes: [],
        totalCount: 0,
      };
    }

    // Вычисляем мин/макс для числовых полей
    const prices = allProperties
      .map((item: any) => parseInt(item.priceCheckmate) || 0)
      .filter((price: number) => price > 0);

    const pricesPerM2 = allProperties
      .map((item: any) => parseInt(item.priceM2Checkmate) || 0)
      .filter((price: number) => price > 0);

    const areas = allProperties
      .map((item: any) => parseFloat(item.totalArea) || 0)
      .filter((area: number) => area > 0);

    const entrances = allProperties
      .map((item: any) => parseInt(item.entrance) || 0)
      .filter((entrance: number) => entrance > 0);

    // Получаем уникальные значения для категориальных полей
    const rooms = Array.from(
      new Set(
        allProperties
          .map((item: any) => item.room?.toString())
          .filter((room: string | undefined) => room && room !== "0")
      )
    ).sort((a, b) => parseInt(a) - parseInt(b));

    const districts = Array.from(
      new Set(
        allProperties
          .map((item: any) => item.project?.district)
          .filter((district: string | undefined) => district)
      )
    ).sort();

    const complexes = Array.from(
      new Set(
        allProperties
          .map((item: any) => item.project?.projectName)
          .filter((complex: string | undefined) => complex)
      )
    ).sort();

    const result: PropertyFiltersMetadata = {
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      pricePerM2Range: {
        min: pricesPerM2.length > 0 ? Math.min(...pricesPerM2) : 0,
        max: pricesPerM2.length > 0 ? Math.max(...pricesPerM2) : 0,
      },
      areaRange: {
        min: areas.length > 0 ? Math.min(...areas) : 0,
        max: areas.length > 0 ? Math.max(...areas) : 0,
      },
      entranceRange: {
        min: entrances.length > 0 ? Math.min(...entrances) : 0,
        max: entrances.length > 0 ? Math.max(...entrances) : 0,
      },
      roomCount: rooms,
      districts,
      complexes,
      totalCount,
    };
    console.log("[flats getPropertyFiltersMetadata] ok → totalCount:", totalCount, "priceRange:", result.priceRange);
    metadataCache = { data: result, expiresAt: Date.now() + METADATA_CACHE_TTL_MS };
    return result;
  } catch (error) {
    console.error("[flats getPropertyFiltersMetadata] error:", error);
    return {
      priceRange: { min: 0, max: 0 },
      pricePerM2Range: { min: 0, max: 0 },
      areaRange: { min: 0, max: 0 },
      entranceRange: { min: 0, max: 0 },
      roomCount: [],
      districts: [],
      complexes: [],
      totalCount: 0,
    };
  }
}