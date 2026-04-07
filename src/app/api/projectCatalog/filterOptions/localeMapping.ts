import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
let cache: {
  districtRuToKk: Record<string, string>;
  districtKkToRu: Record<string, string>;
  projectRuToKk: Record<string, string>;
  projectKkToRu: Record<string, string>;
  expiresAt: number;
} | null = null;

async function fetchProjectLocalePairs(
  baseUrl: string,
  headers: Record<string, string>,
  baseFilter: string,
  availabilityFilter: string,
  locale: string
): Promise<Map<number, { district: string; projectName: string }>> {
  const map = new Map<number, { district: string; projectName: string }>();
  let page = 1;
  const pageSize = 100;

  while (true) {
    const url = `${baseUrl}/api/properties?${baseFilter}${availabilityFilter}filters[project][publishedAt][$notNull]=true&filters[priceCheckmate][$gte]=10000000&fields[0]=id&populate[project][fields][0]=id&populate[project][fields][1]=district&populate[project][fields][2]=projectName&locale=${locale}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const res = await strapiAxios.get(url, { headers });
    if (!Array.isArray(res?.data?.data)) break;

    res.data.data.forEach((item: any) => {
      const project = item.project;
      const id = project?.id ?? project?.data?.id;
      if (id != null) {
        const district = project?.district ?? project?.data?.district ?? "";
        const projectName = project?.projectName ?? project?.data?.projectName ?? "";
        if (district || projectName) {
          map.set(Number(id), { district: String(district).trim(), projectName: String(projectName).trim() });
        }
      }
    });

    const pagination = res.data.meta?.pagination;
    if (!pagination || page >= pagination.pageCount || res.data.data.length < pageSize) break;
    page++;
    if (page > 100) break;
  }

  return map;
}

export async function getDistrictProjectLocaleMapping(
  baseFilter: string,
  availabilityFilter: string
): Promise<{
  districtRuToKk: Record<string, string>;
  districtKkToRu: Record<string, string>;
  projectRuToKk: Record<string, string>;
  projectKkToRu: Record<string, string>;
}> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return {
      districtRuToKk: cache.districtRuToKk,
      districtKkToRu: cache.districtKkToRu,
      projectRuToKk: cache.projectRuToKk,
      projectKkToRu: cache.projectKkToRu,
    };
  }

  const baseUrl = getStrapiBaseUrl();
  const headers = { ...getStrapiHeaders(), "Accept-Language": "ru" };
  const headersKk = { ...getStrapiHeaders(), "Accept-Language": "kk" };

  const [ruMap, kkMap] = await Promise.all([
    fetchProjectLocalePairs(baseUrl, headers, baseFilter, availabilityFilter, "ru"),
    fetchProjectLocalePairs(baseUrl, headersKk, baseFilter, availabilityFilter, "kk"),
  ]);

  const districtRuToKk: Record<string, string> = {};
  const districtKkToRu: Record<string, string> = {};
  const projectRuToKk: Record<string, string> = {};
  const projectKkToRu: Record<string, string> = {};

  const allProjectIds = new Set([...ruMap.keys(), ...kkMap.keys()]);
  allProjectIds.forEach((projectId) => {
    const ru = ruMap.get(projectId);
    const kk = kkMap.get(projectId);
    const ruDist = ru?.district?.trim();
    const kkDist = kk?.district?.trim();
    const ruProj = ru?.projectName?.trim();
    const kkProj = kk?.projectName?.trim();
    if (ruDist) {
      districtRuToKk[ruDist] = kkDist ?? ruDist;
      if (kkDist) districtKkToRu[kkDist] = ruDist;
    }
    if (kkDist && !districtKkToRu[kkDist]) {
      districtKkToRu[kkDist] = ruDist ?? kkDist;
    }
    if (ruProj) {
      projectRuToKk[ruProj] = kkProj ?? ruProj;
      if (kkProj) projectKkToRu[kkProj] = ruProj;
    }
    if (kkProj && !projectKkToRu[kkProj]) {
      projectKkToRu[kkProj] = ruProj ?? kkProj;
    }
  });

  cache = {
    districtRuToKk,
    districtKkToRu,
    projectRuToKk,
    projectKkToRu,
    expiresAt: now + CACHE_TTL_MS,
  };
  return cache;
}

/** Resolve district/project from URL (may be ru or kk) to value for current locale for Strapi filter */
export function resolveToCurrentLocale(
  urlValue: string,
  locale: string,
  maps: {
    districtRuToKk: Record<string, string>;
    districtKkToRu: Record<string, string>;
    projectRuToKk: Record<string, string>;
    projectKkToRu: Record<string, string>;
  },
  kind: "district" | "project"
): string {
  if (!urlValue?.trim()) return urlValue;
  const { districtRuToKk, districtKkToRu, projectRuToKk, projectKkToRu } = maps;
  if (kind === "district") {
    return locale === "kk"
      ? (districtRuToKk[urlValue] ?? urlValue)
      : (districtKkToRu[urlValue] ?? urlValue);
  }
  return locale === "kk"
    ? (projectRuToKk[urlValue] ?? urlValue)
    : (projectKkToRu[urlValue] ?? urlValue);
}
