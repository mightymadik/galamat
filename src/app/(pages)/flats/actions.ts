"use server";

import { getProperties, getPropertyFiltersMetadata, PropertyFilters } from "@/app/api/properties/getProperties";
import { FlatsFilterParams } from "@/types/flat";

function toPropertyFilters(filters: FlatsFilterParams): PropertyFilters {
  return {
    priceRange: filters.priceRange,
    pricePerM2Range: filters.pricePerM2Range,
    areaRange: filters.areaRange,
    entranceRange: filters.entranceRange,
    roomCount: filters.roomCount,
    district: filters.district,
    project: filters.project,
    tags: filters.tags,
  };
}

export async function getFlatsCatalogPage(input: {
  filters: FlatsFilterParams;
  page: number;
  pageSize: number;
}) {
  const result = await getProperties(toPropertyFilters(input.filters), {
    page: input.page,
    pageSize: input.pageSize,
    light: false,
    allStatuses: false,
  });

  if (result && typeof result === "object" && "data" in result && "meta" in result) {
    return result;
  }

  return {
    data: Array.isArray(result) ? result : [],
    meta: {
      total: Array.isArray(result) ? result.length : 0,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: 1,
    },
  };
}

export async function getFlatsMetadata() {
  return getPropertyFiltersMetadata({ onlyAvailable: true });
}

export async function getFlatsForChessboard(input: { project: string }) {
  const filters = toPropertyFilters({
    project: input.project,
  });

  const result = await getProperties(filters, {
    light: true,
    allStatuses: true,
  });

  return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
}

export async function getFlatsCount(input: { filters: FlatsFilterParams }) {
  const result = await getProperties(toPropertyFilters(input.filters), {
    page: 1,
    pageSize: 1,
    light: true,
    allStatuses: false,
  });
  if (result && typeof result === "object" && "meta" in result) {
    return Number(result.meta?.total ?? 0);
  }
  return Array.isArray(result) ? result.length : 0;
}
