import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProperties, getPropertyFiltersMetadata, PropertyFilters } from "../properties/getProperties";
import { getDistrictProjectLocaleMapping, resolveToCurrentLocale } from "../projectCatalog/filterOptions/localeMapping";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value || "ru";
    const searchParams = request.nextUrl.searchParams;

    if (searchParams.has("metadata") && searchParams.get("metadata") === "true") {
      const metadata = await getPropertyFiltersMetadata();
      console.log("[flats API] GET metadata=true → totalCount:", metadata?.totalCount, "priceRange:", metadata?.priceRange);
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
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = pageParam != null ? parseInt(pageParam, 10) : undefined;
    const pageSize = pageSizeParam != null ? parseInt(pageSizeParam, 10) : undefined;
    const usePagination = page != null && pageSize != null && pageSize > 0;

    const options = { light, allStatuses, ...(usePagination ? { page, pageSize } : {}) };
    const result = await getProperties(filters, options);

    const dataLength = Array.isArray(result) ? result.length : (result && typeof result === "object" && "data" in result ? (result as { data: unknown[] }).data?.length : 0);
    const total = result && typeof result === "object" && "meta" in result ? (result as { meta: { total?: number } }).meta?.total : undefined;
    console.log("[flats API] GET list → page:", page, "pageSize:", pageSize, "filters:", Object.keys(filters).join(",") || "none", "→ dataLength:", dataLength, "meta.total:", total);

    if (usePagination && result && typeof result === "object" && "data" in result && "meta" in result) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[flats API] Error in properties API route:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}
