type CatalogPayload = {
  data: any[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

const cache = new Map<string, CatalogPayload>();

export function getCatalogCacheKey(input: {
  filters: unknown;
  page: number;
  pageSize: number;
  type: string;
}) {
  return JSON.stringify(input);
}

export function getCachedCatalog(key: string): CatalogPayload | undefined {
  return cache.get(key);
}

export function setCachedCatalog(key: string, payload: CatalogPayload) {
  cache.set(key, payload);
}
