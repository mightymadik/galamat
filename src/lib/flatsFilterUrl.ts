import { FlatsFilterParams } from "@/types/flat";

const URL_KEYS = {
  priceMin: "priceMin",
  priceMax: "priceMax",
  pricePerM2Min: "pricePerM2Min",
  pricePerM2Max: "pricePerM2Max",
  areaMin: "areaMin",
  areaMax: "areaMax",
  entranceMin: "entranceMin",
  entranceMax: "entranceMax",
  roomCount: "rooms",
  district: "district",
  project: "project",
  tags: "tags",
} as const;

type Range = [number, number];

function toInt(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeRange(min?: number, max?: number): Range | undefined {
  if (min == null || max == null) return undefined;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return [a, b];
}

function splitList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  const arr = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!arr.length) return undefined;
  // unique + sort для стабильности
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function setIf(sp: URLSearchParams, key: string, value?: string) {
  if (!value) return;
  const v = value.trim();
  if (!v) return;
  sp.set(key, v);
}

/**
 * Каноническая строка query:
 * - сортируем ключи
 * - убираем пустые
 */
export function normalizeQueryString(input: URLSearchParams): string {
  const entries = Array.from(input.entries())
    .map(([k, v]) => [k, String(v).trim()] as const)
    .filter(([, v]) => v !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.append(k, v);
  return sp.toString();
}

/**
 * IMPORTANT: мы пишем параметры в фиксированном порядке,
 * чтобы qs всегда был стабильным и не "подкручивался".
 */
export function flattenFilterParamsToSearchParams(params: FlatsFilterParams): URLSearchParams {
  const sp = new URLSearchParams();

  const p = normalizeFilterParams(params);

  if (p.priceRange) {
    sp.set(URL_KEYS.priceMin, String(p.priceRange[0]));
    sp.set(URL_KEYS.priceMax, String(p.priceRange[1]));
  }
  if (p.pricePerM2Range) {
    sp.set(URL_KEYS.pricePerM2Min, String(p.pricePerM2Range[0]));
    sp.set(URL_KEYS.pricePerM2Max, String(p.pricePerM2Range[1]));
  }
  if (p.areaRange) {
    sp.set(URL_KEYS.areaMin, String(p.areaRange[0]));
    sp.set(URL_KEYS.areaMax, String(p.areaRange[1]));
  }
  if (p.entranceRange) {
    sp.set(URL_KEYS.entranceMin, String(p.entranceRange[0]));
    sp.set(URL_KEYS.entranceMax, String(p.entranceRange[1]));
  }

  if (p.roomCount?.length) sp.set(URL_KEYS.roomCount, p.roomCount.join(","));
  setIf(sp, URL_KEYS.district, p.district);
  setIf(sp, URL_KEYS.project, p.project);
  if (p.tags?.length) sp.set(URL_KEYS.tags, p.tags.join(","));

  return sp;
}

/**
 * Нормализуем объект фильтров, чтобы:
 * - диапазоны всегда min<=max
 * - списки уникальные и сортированные (стабильность)
 * - пустые значения не протекали
 */
export function normalizeFilterParams(params: FlatsFilterParams): FlatsFilterParams {
  const out: FlatsFilterParams = {};

  if (params.priceRange) {
    const r = normalizeRange(params.priceRange[0], params.priceRange[1]);
    if (r) out.priceRange = r;
  }
  if (params.pricePerM2Range) {
    const r = normalizeRange(params.pricePerM2Range[0], params.pricePerM2Range[1]);
    if (r) out.pricePerM2Range = r;
  }
  if (params.areaRange) {
    const r = normalizeRange(params.areaRange[0], params.areaRange[1]);
    if (r) out.areaRange = r;
  }
  if (params.entranceRange) {
    const r = normalizeRange(params.entranceRange[0], params.entranceRange[1]);
    if (r) out.entranceRange = r;
  }

  if (params.roomCount?.length) {
    const list = Array.from(new Set(params.roomCount.map(String).map((s) => s.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    if (list.length) out.roomCount = list;
  }

  const district = params.district?.trim();
  if (district) out.district = district;

  const project = params.project?.trim();
  if (project) out.project = project;

  if (params.tags?.length) {
    const list = Array.from(new Set(params.tags.map(String).map((s) => s.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    if (list.length) out.tags = list;
  }

  return out;
}

/** Один ключ для сравнения «те же фильтры или нет» (как в URL после flatten). */
export function filterParamsCanonicalKey(params: FlatsFilterParams): string {
  return normalizeQueryString(flattenFilterParamsToSearchParams(normalizeFilterParams(params)));
}

export function parseSearchParamsToFilterParams(searchParams: URLSearchParams): FlatsFilterParams {
  const params: FlatsFilterParams = {};

  const priceMin = toInt(searchParams.get(URL_KEYS.priceMin));
  const priceMax = toInt(searchParams.get(URL_KEYS.priceMax));
  const priceRange = normalizeRange(priceMin, priceMax);
  if (priceRange) params.priceRange = priceRange;

  const ppmMin = toInt(searchParams.get(URL_KEYS.pricePerM2Min));
  const ppmMax = toInt(searchParams.get(URL_KEYS.pricePerM2Max));
  const pricePerM2Range = normalizeRange(ppmMin, ppmMax);
  if (pricePerM2Range) params.pricePerM2Range = pricePerM2Range;

  const areaMin = toInt(searchParams.get(URL_KEYS.areaMin));
  const areaMax = toInt(searchParams.get(URL_KEYS.areaMax));
  const areaRange = normalizeRange(areaMin, areaMax);
  if (areaRange) params.areaRange = areaRange;

  const entMin = toInt(searchParams.get(URL_KEYS.entranceMin));
  const entMax = toInt(searchParams.get(URL_KEYS.entranceMax));
  const entranceRange = normalizeRange(entMin, entMax);
  if (entranceRange) params.entranceRange = entranceRange;

  const rooms = splitList(searchParams.get(URL_KEYS.roomCount));
  if (rooms) params.roomCount = rooms;

  const district = searchParams.get(URL_KEYS.district)?.trim();
  if (district) params.district = district;

  const project = searchParams.get(URL_KEYS.project)?.trim();
  if (project) params.project = project;

  const tags = splitList(searchParams.get(URL_KEYS.tags));
  if (tags) params.tags = tags;

  return params;
}