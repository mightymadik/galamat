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

  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  /**
   * When Effect 1 (URL→state) calls setFilterParams, the state hasn't flushed yet.
   * Effect 2 (state→URL) runs in the same commit with STALE filterParams and would
   * push the old query back → infinite loop.  This ref blocks that stale push.
   */
  const syncingFromUrlRef = useRef(false);

  const initialFilterParamsFromUrl = useMemo(
    () => parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString())),
    [urlQs],
  );

  // 1) URL → state (external navigation, back/forward, header link click)
  useEffect(() => {
    const fromUrl = parseSearchParamsToFilterParams(
      new URLSearchParams(searchParams.toString()),
    );
    const fromKey = filterParamsCanonicalKey(fromUrl);
    const currentKey = filterParamsCanonicalKey(filterParams);
    if (fromKey === currentKey) return;

    syncingFromUrlRef.current = true;
    setFilterParams(normalizeFilterParams(fromUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQs]);

  // 2) state → URL (user changed filters via UI)
  useEffect(() => {
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }
    const nextQs = normalizeQueryString(
      flattenFilterParamsToSearchParams(filterParams),
    );
    if (nextQs === urlQs) return;
    router.replace(nextQs ? `/flats?${nextQs}` : "/flats", { scroll: false });
  }, [filterParams, urlQs, router]);

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
      />
      <FlatsPageCatalog
        filterParams={filterParams}
        onTotalCountChange={setTotalCount}
        onProjectChange={handleProjectChange}
      />
    </div>
  );
}

export default withPreload(Page);
