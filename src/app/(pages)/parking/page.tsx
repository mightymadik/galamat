"use client";

import withPreload from "@/components/common/preload/withPreload";
import FlatsPageFilter from "@/components/layout/flatsPage/FlatsPageFilterContainer/flatsPageFilterContainer";
import FlatsPageCatalog from "@/components/layout/flatsPage/FlatsPageCatalog/flatsPageCatalog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatsFilterParams } from "@/types/flat";
import { useSearchParams, useRouter } from "next/navigation";
import {
  filterParamsCanonicalKey,
  flattenFilterParamsToSearchParams,
  normalizeFilterParams,
  parseSearchParamsToFilterParams,
} from "@/lib/flatsFilterUrl";

function normalizeQueryString(sp: URLSearchParams): string {
  const entries = Array.from(sp.entries())
    .filter(([_, v]) => v != null && String(v).trim() !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const normalized = new URLSearchParams();
  for (const [k, v] of entries) normalized.append(k, v);
  return normalized.toString();
}

function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQs = useMemo(
    () => normalizeQueryString(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [filterParams, setFilterParams] = useState<FlatsFilterParams>(() =>
    parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString())),
  );
  const [viewType, setViewType] = useState<string>(() => {
    const raw = searchParams.get("view");
    return raw && raw.trim() ? raw.trim() : "block";
  });

  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const syncingFromUrlRef = useRef(false);

  const initialFilterParamsFromUrl = useMemo(
    () => parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString())),
    [urlQs],
  );

  useEffect(() => {
    const fromUrl = parseSearchParamsToFilterParams(
      new URLSearchParams(searchParams.toString()),
    );
    const fromKey = filterParamsCanonicalKey(fromUrl);
    const currentKey = filterParamsCanonicalKey(filterParams);
    if (fromKey === currentKey) return;

    syncingFromUrlRef.current = true;
    setFilterParams(normalizeFilterParams(fromUrl));
    const nextView = searchParams.get("view");
    setViewType(nextView && nextView.trim() ? nextView.trim() : "block");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQs]);

  useEffect(() => {
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }
    const nextQs = normalizeQueryString(
      flattenFilterParamsToSearchParams(filterParams),
    );
    const withView = new URLSearchParams(nextQs);
    if (viewType && viewType !== "block") withView.set("view", viewType);
    const nextQsWithView = normalizeQueryString(withView);
    if (nextQsWithView === urlQs) return;
    router.replace(nextQsWithView ? `/parking?${nextQsWithView}` : "/parking", { scroll: false });
  }, [filterParams, viewType, urlQs, router]);

  const applyFiltersFromUi = useCallback((next: FlatsFilterParams) => {
    setFilterParams((prev) => {
      const norm = normalizeFilterParams(next);
      if (filterParamsCanonicalKey(prev) === filterParamsCanonicalKey(norm))
        return prev;
      return norm;
    });
  }, []);

  const handleProjectChange = useCallback((project: string | null) => {
    setFilterParams((prev) => {
      const next = { ...prev };
      if (project) next.project = project;
      else delete next.project;
      return next;
    });
  }, []);

  return (
    <div className="mt-[68px]">
      <FlatsPageFilter
        initialFilterParams={initialFilterParamsFromUrl}
        onFilterChange={applyFiltersFromUi}
        totalCount={totalCount}
        realEstateType="parking"
      />
      <FlatsPageCatalog
        filterParams={filterParams}
        onTotalCountChange={setTotalCount}
        onProjectChange={handleProjectChange}
        initialViewType={viewType}
        onViewTypeChange={setViewType}
        realEstateType="parking"
        detailBasePath="/parking"
      />
    </div>
  );
}

export default withPreload(Page);
