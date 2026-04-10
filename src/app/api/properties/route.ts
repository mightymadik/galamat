import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProperties, getPropertyFiltersMetadata, PropertyFilters } from "../properties/getProperties";
import { getDistrictProjectLocaleMapping, resolveToCurrentLocale } from "../projectCatalog/filterOptions/localeMapping";
import { apiGet } from "../fetcher";
import { getLocale } from "@/lib/getLocale";
import { rateLimit } from "../../../middleware/rate-limit";

type RealEstateType = "property" | "commerce" | "parking" | "pantry";
const TYPE_CONFIG: Record<RealEstateType, {
  apiPath: string;
  statusField: string;
  numberField: string;
  supportsArea: boolean;
  supportsPricePerM2: boolean;
  supportsMedia: boolean;
}> = {
  property: { apiPath: "/api/properties", statusField: "propertyStatus", numberField: "apartmentNumber", supportsArea: true, supportsPricePerM2: true, supportsMedia: true },
  commerce: { apiPath: "/api/commerces", statusField: "commerceStatus", numberField: "commerceNumber", supportsArea: true, supportsPricePerM2: true, supportsMedia: true },
  parking: { apiPath: "/api/parkings", statusField: "parkingStatus", numberField: "parkingNumber", supportsArea: false, supportsPricePerM2: false, supportsMedia: false },
  pantry: { apiPath: "/api/pantrys", statusField: "pantryStatus", numberField: "numberPantry", supportsArea: true, supportsPricePerM2: true, supportsMedia: false },
};

function parseType(raw: string | null): RealEstateType {
  if (raw === "commerce" || raw === "parking" || raw === "pantry") return raw;
  return "property";
}

export async function GET(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const allowed = await rateLimit(`properties:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
    }

    const type = parseType(request.nextUrl.searchParams.get("type"));
    if (type !== "property") {
      return handleNonResidential(request, type);
    }

    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value || "ru";
    const searchParams = request.nextUrl.searchParams;

    if (searchParams.has("metadata") && searchParams.get("metadata") === "true") {
      const metadata = await getPropertyFiltersMetadata({ onlyAvailable: true });
      return NextResponse.json(metadata);
    }

    const baseFilter = "";
    const availabilityFilter = "filters[propertyStatus][$eq]=свободно&filters[saleStatus][$eq]=открыто&";
    const localeMaps = await getDistrictProjectLocaleMapping(baseFilter, availabilityFilter);

    // Парсим фильтры из query параметров; district/project приводим к текущей локали (чтобы при смене КК→РУ данные находились)
    const filters: PropertyFilters = {};

    if (searchParams.has("priceRange")) {
      const [min, max] = searchParams.get("priceRange")!.split(",").map(Number);
      filters.priceRange = [min, max];
    }

    if (searchParams.has("pricePerM2Range")) {
      const [min, max] = searchParams.get("pricePerM2Range")!.split(",").map(Number);
      filters.pricePerM2Range = [min, max];
    }

    if (searchParams.has("areaRange")) {
      const [min, max] = searchParams.get("areaRange")!.split(",").map(Number);
      filters.areaRange = [min, max];
    }

    if (searchParams.has("entranceRange")) {
      const [min, max] = searchParams.get("entranceRange")!.split(",").map(Number);
      filters.entranceRange = [min, max];
    }

    if (searchParams.has("roomCount")) {
      const v = searchParams.get("roomCount")!;
      filters.roomCount = v.includes(",") ? v.split(",").map(s => s.trim()).filter(Boolean) : v;
    }

    if (searchParams.has("district")) {
      const raw = searchParams.get("district")!.trim();
      filters.district = resolveToCurrentLocale(raw, locale, localeMaps, "district");
    }

    if (searchParams.has("project")) {
      const raw = searchParams.get("project")!.trim();
      filters.project = resolveToCurrentLocale(raw, locale, localeMaps, "project");
    }

    if (searchParams.has("tags")) {
      filters.tags = searchParams.get("tags")!.split(",");
    }

    if (searchParams.has("ids")) {
      const idsStr = searchParams.get("ids")!;
      filters.ids = idsStr.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
    }

    const light = searchParams.get("light") === "1" || searchParams.get("light") === "true";
    const allStatuses = searchParams.get("allStatuses") === "1" || searchParams.get("allStatuses") === "true";
    if (allStatuses && !searchParams.get("project")) {
      return NextResponse.json({ error: "project is required when allStatuses=true" }, { status: 400 });
    }
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = pageParam != null ? parseInt(pageParam, 10) : undefined;
    const pageSize = pageSizeParam != null ? parseInt(pageSizeParam, 10) : undefined;
    const usePagination = page != null && pageSize != null && pageSize > 0;

    const options = { light, allStatuses, ...(usePagination ? { page, pageSize } : {}) };
    const result = await getProperties(filters, options);

    if (usePagination && result && typeof result === "object" && "data" in result && "meta" in result) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

async function handleNonResidential(request: NextRequest, type: Exclude<RealEstateType, "property">) {
  const searchParams = request.nextUrl.searchParams;
  const cfg = TYPE_CONFIG[type];
  const locale = await getLocale();
  const metadataMode = searchParams.get("metadata") === "true";

  const params: Record<string, string> = {
    "fields[0]": "priceCheckmate",
    "fields[1]": "section",
    "fields[2]": "entrance",
    "fields[3]": cfg.statusField,
    "fields[4]": "saleStatus",
    "fields[5]": cfg.numberField,
    "fields[6]": "documentId",
    "populate[project][fields][0]": "projectName",
    "populate[project][fields][1]": "district",
    "populate[project][fields][2]": "documentId",
    "populate[project][populate][complexes][fields][0]": "complexAddress",
    "populate[project][populate][complexes][fields][1]": "locale",
    "populate[paymentConditions][fields][0]": "paymentMethod",
  };
  if (cfg.supportsArea) params["fields[7]"] = "totalArea";
  if (cfg.supportsPricePerM2) params["fields[8]"] = "priceM2Checkmate";
  if (cfg.supportsMedia) {
    params["populate[plan][fields][0]"] = "url";
    params["populate[platformPlan][fields][0]"] = "url";
  }

  if (!metadataMode) {
    params[`filters[${cfg.statusField}][$eq]`] = "свободно";
    params["filters[saleStatus][$eq]"] = "открыто";
    params["filters[project][publishedAt][$notNull]"] = "true";
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    if (page && pageSize) {
      params["pagination[page]"] = page;
      params["pagination[pageSize]"] = pageSize;
    } else {
      params["pagination[page]"] = "1";
      params["pagination[pageSize]"] = "100";
    }
  } else {
    params["filters[project][publishedAt][$notNull]"] = "true";
    params["pagination[page]"] = "1";
    params["pagination[pageSize]"] = "500";
  }

  const passthroughKeys = ["priceRange", "pricePerM2Range", "areaRange", "entranceRange"];
  for (const k of passthroughKeys) {
    const raw = searchParams.get(k);
    if (!raw) continue;
    const [min, max] = raw.split(",").map(Number);
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
    if (k === "priceRange") { params["filters[priceCheckmate][$gte]"] = String(min); params["filters[priceCheckmate][$lte]"] = String(max); }
    if (k === "pricePerM2Range" && cfg.supportsPricePerM2) {
      params["filters[priceM2Checkmate][$gte]"] = String(min);
      params["filters[priceM2Checkmate][$lte]"] = String(max);
    }
    if (k === "areaRange" && cfg.supportsArea) {
      params["filters[totalArea][$gte]"] = String(min);
      params["filters[totalArea][$lte]"] = String(max);
    }
    if (k === "entranceRange") { params["filters[entrance][$gte]"] = String(min); params["filters[entrance][$lte]"] = String(max); }
  }

  if (searchParams.get("project")) params["filters[project][projectName][$eq]"] = String(searchParams.get("project"));
  if (searchParams.get("district")) params["filters[project][district][$eq]"] = String(searchParams.get("district"));

  const raw = await apiGet({ path: cfg.apiPath, params }, true);
  const list = Array.isArray((raw as any)?.data) ? (raw as any).data : Array.isArray(raw) ? (raw as any) : [];
  const mapped = list.map((item: any) => {
    const complexes = Array.isArray(item?.project?.complexes) ? item.project.complexes : [];
    const localizedComplex = complexes.find((c: any) => String(c?.locale) === String(locale)) ?? complexes[0];
    const tags = Array.isArray(item?.paymentConditions) ? item.paymentConditions.map((pc: any) => pc?.paymentMethod).filter(Boolean) : [];
    const plan = Array.isArray(item?.plan) ? item.plan : item?.plan ? [item.plan] : [];
    const platform = Array.isArray(item?.platformPlan) ? item.platformPlan : item?.platformPlan ? [item.platformPlan] : [];
    const status = item?.[cfg.statusField] ?? "свободно";
    return {
      id: item.id,
      documentId: item.documentId,
      room: Number(item.room) || 0,
      totalArea: Number(item.totalArea) || 0,
      priceCheckmate: Number(item.priceCheckmate) || 0,
      priceM2Checkmate: Number(item.priceM2Checkmate) || 0,
      floor: Number(item.floor) || 0,
      section: String(item.section ?? "0"),
      entrance: Number(item.entrance) || 0,
      projectName: item?.project?.projectName ?? "",
      district: item?.project?.district ?? "",
      complexAddress: localizedComplex?.complexAddress ?? "",
      images: plan.map((p: any) => p?.url).filter(Boolean),
      platformPlanImages: platform.map((p: any) => p?.url).filter(Boolean),
      tags,
      propertyStatus: status,
      apartmentNumber: item?.[cfg.numberField] ?? item?.id,
      numberApartmentFloor: Number(item?.numberApartmentFloor) || 0,
      saleStatus: item?.saleStatus,
    };
  });

  if (metadataMode) {
    const prices = mapped.map((m: any) => m.priceCheckmate).filter((n: number) => Number.isFinite(n) && n > 0);
    const perM2 = mapped.map((m: any) => m.priceM2Checkmate).filter((n: number) => Number.isFinite(n) && n > 0);
    const areas = mapped.map((m: any) => m.totalArea).filter((n: number) => Number.isFinite(n) && n > 0);
    const entrances = mapped.map((m: any) => m.entrance).filter((n: number) => Number.isFinite(n) && n > 0);
    const districts = Array.from(new Set(mapped.map((m: any) => m.district).filter(Boolean)));
    const complexes = Array.from(new Set(mapped.map((m: any) => m.projectName).filter(Boolean)));
    return NextResponse.json({
      priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
      pricePerM2Range: { min: perM2.length ? Math.min(...perM2) : 0, max: perM2.length ? Math.max(...perM2) : 0 },
      areaRange: { min: areas.length ? Math.min(...areas) : 0, max: areas.length ? Math.max(...areas) : 0 },
      entranceRange: { min: entrances.length ? Math.min(...entrances) : 0, max: entrances.length ? Math.max(...entrances) : 0 },
      roomCount: [],
      districts,
      complexes,
      totalCount: mapped.length,
    });
  }

  const pagination = (raw as any)?.meta?.pagination;
  if (pagination?.total != null && searchParams.get("page") && searchParams.get("pageSize")) {
    return NextResponse.json({
      data: mapped,
      meta: { total: pagination.total, page: pagination.page, pageSize: pagination.pageSize, pageCount: pagination.pageCount },
    });
  }
  return NextResponse.json(mapped);
}
