"use client";

import withPreload from "@/components/common/preload/withPreload";
import FlatsPageFilter from "@/components/layout/flatsPage/FlatsPageFilterContainer/flatsPageFilterContainer";
import FlatsPageCatalog from "@/components/layout/flatsPage/FlatsPageCatalog/flatsPageCatalog";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatsFilterParams } from "@/types/flat";
import { useSearchParams, useRouter } from "next/navigation";
import {
  flattenFilterParamsToSearchParams,
  parseSearchParamsToFilterParams,
} from "@/lib/flatsFilterUrl";

function normalizeQueryString(sp: URLSearchParams): string {
  // канонизируем: сортируем ключи, убираем пустые
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

  // Канонический текущий qs из URL
  const urlQs = useMemo(
    () => normalizeQueryString(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  // initial берём ОДИН раз из URL (чтобы не было "дерганья" при каждом searchParams)
  const [filterParams, setFilterParams] = useState<FlatsFilterParams>(() =>
    parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString()))
  );

  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const handleProjectChange = useCallback((project: string | null) => {
    setFilterParams((prev) => {
      const next = { ...prev };
      if (project) {
        next.project = project;
      } else {
        delete next.project;
      }
      return next;
    });
  }, []);

  // Флаг: какой qs мы сами только что запушили, чтобы не ловить его обратно
  const lastPushedQsRef = useRef<string>("");

  // initialFilterParams only from URL (stable when urlQs unchanged) — never from filterParams to avoid loop
  const initialFilterParamsFromUrl = useMemo(
    () => parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString())),
    [urlQs]
  );

  // 1) URL -> state (back/forward / открыли шарибельную ссылку)
  useEffect(() => {
    if (urlQs && urlQs === lastPushedQsRef.current) return;

    const fromUrl = parseSearchParamsToFilterParams(new URLSearchParams(searchParams.toString()));
    const fromUrlQs = normalizeQueryString(flattenFilterParamsToSearchParams(fromUrl));
    const currentQs = normalizeQueryString(flattenFilterParamsToSearchParams(filterParams));
    if (fromUrlQs === currentQs) return;

    setFilterParams(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQs]);

  // 2) state -> URL (когда юзер меняет фильтры)
  useEffect(() => {
    const nextQs = normalizeQueryString(flattenFilterParamsToSearchParams(filterParams));
    if (nextQs === urlQs) return;

    lastPushedQsRef.current = nextQs;
    const path = nextQs ? `/flats?${nextQs}` : "/flats";
    router.replace(path, { scroll: false });
  }, [filterParams, urlQs, router]);

  return (
    <div className="mt-[68px]">
      <FlatsPageFilter
        initialFilterParams={initialFilterParamsFromUrl}
        onFilterChange={setFilterParams}
        totalCount={totalCount}
      />

      <FlatsPageCatalog filterParams={filterParams} onTotalCountChange={setTotalCount} onProjectChange={handleProjectChange} />
    </div>
  );
}

export default withPreload(Page);