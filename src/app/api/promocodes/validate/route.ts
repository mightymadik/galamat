import { NextResponse } from "next/server";
import axios from "axios";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";

const baseUrl = () => getStrapiBaseUrl().replace(/\/$/, "");
const headers = () => getStrapiHeaders();

/** Filter row from promocodeRule.filters */
interface FilterRow {
  field: string;
  operator: string;
  value: string | number;
}

/** Flat payload: property fields that can be used in promocodeRule filters */
interface FlatForValidation {
  apartmentNumber?: number | string;
  house?: number | string;
  section?: string;
  entrance?: number | string;
  floor?: number | string;
  room?: number | string;
  sunshine?: string;
  planView?: string;
  floorGroup?: string;
  loggiaView?: string;
  location?: string;
  riseRow?: number;
  windowView?: string;
  /** Сырьё с API нежилых: номер лота часто в apartmentNumber, в правилах — отдельные поля */
  parkingNumber?: number | string;
  commerceNumber?: number | string;
  numberPantry?: number | string;
  [key: string]: unknown;
}

function applyOperator(flatValue: unknown, op: string, filterValue: string | number): boolean {
  const fv = filterValue;
  const opNorm = op === "eq" || op === "=" ? "$eq" : op === "ne" ? "$ne" : op;
  if (opNorm === "$eq") {
    const a = String(flatValue ?? "").trim();
    const b = String(fv).trim();
    return a === b || a.toLowerCase() === b.toLowerCase();
  }
  if (opNorm === "$ne") {
    const a = String(flatValue ?? "").trim();
    const b = String(fv).trim();
    return a !== b && a.toLowerCase() !== b.toLowerCase();
  }
  if (opNorm === "$contains") return String(flatValue ?? "").includes(String(fv));
  const numFlat = Number(flatValue);
  const numFilter = Number(fv);
  if (Number.isNaN(numFlat) || Number.isNaN(numFilter)) return false;
  switch (opNorm) {
    case "$gt":
      return numFlat > numFilter;
    case "$gte":
      return numFlat >= numFilter;
    case "$lt":
      return numFlat < numFilter;
    case "$lte":
      return numFlat <= numFilter;
    default:
      return false;
  }
}

/** Filters that apply only to жилая недвижимость (в API нежилые часто приходят с room/floor = 0). */
const RESIDENTIAL_RULE_FIELDS = new Set([
  "room",
  "floor",
  "floorGroup",
  "loggiaView",
  "planView",
  "riseRow",
  "windowView",
  "sunshine",
]);

function flatMatchesRule(
  flat: FlatForValidation,
  filters: FilterRow[] | undefined,
  realEstateType: string | undefined
): boolean {
  if (!filters || filters.length === 0) return true;
  const isNonResidential =
    realEstateType === "commerce" || realEstateType === "parking" || realEstateType === "pantry";
  for (const row of filters) {
    if (!row.field || (row.value !== 0 && row.value !== "0" && !row.value)) continue;
    if (isNonResidential && RESIDENTIAL_RULE_FIELDS.has(String(row.field))) continue;
    const flatVal = flat[row.field] ?? flat[row.field as keyof FlatForValidation];
    if (!applyOperator(flatVal, row.operator || "$eq", row.value)) return false;
  }
  return true;
}

/** Strapi может отдать JSON-поле строкой */
function parsePromocodeRule(rule: unknown): Record<string, unknown> | null {
  if (rule == null || rule === "") return null;
  if (typeof rule === "object" && !Array.isArray(rule)) return rule as Record<string, unknown>;
  if (typeof rule === "string") {
    const s = rule.trim();
    if (!s) return null;
    try {
      const p = JSON.parse(s) as unknown;
      return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Достаём filters из promocodeRule (JSON или вложенная структура Strapi) */
function getFiltersFromRule(rule: unknown): FilterRow[] {
  const r = parsePromocodeRule(rule);
  if (!r) return [];
  const list = r.filters ?? (r as any).attributes?.filters ?? (r as any).data?.attributes?.filters;
  if (Array.isArray(list)) return list as FilterRow[];
  return [];
}

function normDocId(v: unknown): string {
  return String(v ?? "").trim();
}

/** Strapi 5: поля и связи могут быть в `attributes`, на корне записи, или смешанно */
function mergeStrapiEntry(record: unknown): Record<string, unknown> {
  if (!record || typeof record !== "object") return {};
  const r = record as Record<string, unknown>;
  const att = r.attributes;
  if (att && typeof att === "object") {
    return { ...r, ...(att as Record<string, unknown>) };
  }
  return r;
}

function normalizeEstateType(t: string | undefined): string {
  const x = (t || "property").trim().toLowerCase();
  if (x === "commerce") return "commerce";
  if (x === "parking") return "parking";
  if (x === "pantry") return "pantry";
  return "property";
}

/**
 * В админке в promocodeRule сохраняется realEstateType активной вкладки (property | parking | …).
 * Без этого промокод «с вкладки Паркинг» проходил на квартире, если связи не пришли из REST.
 */
function ruleRealEstateTypeMatches(rule: unknown, requestRealEstateType: string | undefined): boolean {
  const ro = parsePromocodeRule(rule);
  if (!ro) return true;
  const nestedData = ro.data && typeof ro.data === "object" ? (ro.data as { attributes?: Record<string, unknown> }) : undefined;
  const raw =
    ro.realEstateType ??
    (ro.attributes as Record<string, unknown> | undefined)?.realEstateType ??
    nestedData?.attributes?.realEstateType;
  if (typeof raw !== "string" || !raw.trim()) return true;
  return normalizeEstateType(raw) === normalizeEstateType(requestRealEstateType);
}

/**
 * Фронт для паркинга/коммерции/кладовки кладёт номер лота в apartmentNumber (см. /api/properties/[id]).
 * В promocodeRule.filters в админке — parkingNumber, commerceNumber, numberPantry.
 */
function augmentFlatForPromocodeFilters(
  flat: FlatForValidation,
  realEstateType: string | undefined
): FlatForValidation {
  const t = (realEstateType || "property").trim().toLowerCase();
  const out: FlatForValidation = { ...flat };
  if (t === "parking" && out.parkingNumber == null && out.apartmentNumber != null) {
    out.parkingNumber = out.apartmentNumber;
  }
  if (t === "commerce" && out.commerceNumber == null && out.apartmentNumber != null) {
    out.commerceNumber = out.apartmentNumber;
  }
  if (t === "pantry" && out.numberPantry == null && out.apartmentNumber != null) {
    out.numberPantry = out.apartmentNumber;
  }
  return out;
}

/** documentId из relation Strapi (v4/v5: data[] или плоский массив) */
function extractRelationDocumentIds(rel: unknown): string[] {
  if (!rel) return [];
  const anyRel = rel as Record<string, unknown>;
  const data = anyRel.data;
  if (Array.isArray(data)) {
    return data
      .map((item: unknown) => {
        const x = item as Record<string, unknown>;
        return normDocId(x?.documentId ?? x?.id ?? (x?.attributes as Record<string, unknown>)?.documentId);
      })
      .filter(Boolean);
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const x = data as Record<string, unknown>;
    const id = normDocId(x.documentId ?? x.id ?? (x.attributes as Record<string, unknown>)?.documentId);
    return id ? [id] : [];
  }
  if (Array.isArray(rel)) {
    return (rel as unknown[])
      .map((item) => {
        const x = item as Record<string, unknown>;
        return normDocId(x?.documentId ?? x?.id);
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * Если заданы связи properties / parkings / …, код только для этого типа и (при списке) для documentId объекта.
 */
function matchesObjectScope(
  attrs: Record<string, unknown>,
  realEstateType: string | undefined,
  objectDocumentId: string | undefined
): boolean {
  const properties = extractRelationDocumentIds(attrs.properties);
  const parkings = extractRelationDocumentIds(attrs.parkings);
  const commerces = extractRelationDocumentIds(attrs.commerces);
  const pantrys = extractRelationDocumentIds(attrs.pantrys);

  const hasScope =
    properties.length > 0 || parkings.length > 0 || commerces.length > 0 || pantrys.length > 0;

  if (!hasScope) return true;

  const oid = normDocId(objectDocumentId);
  if (!oid) return false;

  const t = (realEstateType || "property").trim().toLowerCase();
  const typeKey =
    t === "commerce" ? "commerce" : t === "parking" ? "parking" : t === "pantry" ? "pantry" : "property";

  const forType: Record<string, string[]> = {
    property: properties,
    parking: parkings,
    commerce: commerces,
    pantry: pantrys,
  };

  const idsForCurrent = forType[typeKey] ?? [];
  if (idsForCurrent.length > 0) {
    return idsForCurrent.some((id) => normDocId(id) === oid);
  }

  const otherScoped = Object.entries(forType).some(([k, arr]) => k !== typeKey && arr.length > 0);
  if (otherScoped) return false;

  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, projectDocumentId, flat, payment, realEstateType, objectDocumentId } = body as {
      code?: string;
      projectDocumentId?: string;
      flat?: FlatForValidation;
      payment?: string;
      realEstateType?: string;
      objectDocumentId?: string;
    };

    const trimmedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!trimmedCode) {
      return NextResponse.json({ valid: false, error: "Введите промокод" }, { status: 400 });
    }
    if (!projectDocumentId) {
      return NextResponse.json({ valid: false, error: "Квартира не привязана к проекту" }, { status: 400 });
    }

    let paymentNormalized = typeof payment === "string" && payment.trim() ? payment.trim() : "Full";
    if (paymentNormalized === "Deffered") paymentNormalized = "Deferred";

    const base = baseUrl();
    const h = headers();
    const today = new Date().toISOString().slice(0, 10);

    const baseParams = new URLSearchParams({
      "filters[project][documentId][$eq]": projectDocumentId,
      "pagination[pageSize]": "100",
    });
    const query =
      `${baseParams.toString()}` +
      "&populate[project][fields][0]=documentId" +
      "&populate[promocodes]=true" +
      "&populate[properties][fields][0]=documentId" +
      "&populate[parkings][fields][0]=documentId" +
      "&populate[commerces][fields][0]=documentId" +
      "&populate[pantrys][fields][0]=documentId";

    const res = await axios.get(`${base}/api/promocodes?${query}`, {
      headers: h,
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.status < 200 || res.status >= 300) {
      console.error("Promocode validate Strapi GET failed:", res.status, res.data);
      return NextResponse.json(
        { valid: false, error: "Не удалось загрузить промокоды" },
        { status: 502 }
      );
    }

    const data = res?.data;

    const rawList: any[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];

    const flatPayload: FlatForValidation = flat ?? {};
    const flatNormalized: FlatForValidation = {
      ...flatPayload,
      apartmentNumber: flatPayload.apartmentNumber != null ? Number(flatPayload.apartmentNumber) : undefined,
      house: flatPayload.house != null ? Number(flatPayload.house) : undefined,
      entrance: flatPayload.entrance != null ? Number(flatPayload.entrance) : undefined,
      floor: flatPayload.floor != null ? Number(flatPayload.floor) : undefined,
      room: flatPayload.room != null ? Number(flatPayload.room) : undefined,
      section: flatPayload.section != null ? String(flatPayload.section).trim() : undefined,
      sunshine: flatPayload.sunshine != null ? String(flatPayload.sunshine).trim() : undefined,
      planView: flatPayload.planView != null ? String(flatPayload.planView).trim() : undefined,
      floorGroup: flatPayload.floorGroup != null ? String(flatPayload.floorGroup).trim() : undefined,
      loggiaView: flatPayload.loggiaView != null ? String(flatPayload.loggiaView).trim() : undefined,
      location: flatPayload.location != null ? String(flatPayload.location).trim() : undefined,
      windowView: flatPayload.windowView != null ? String(flatPayload.windowView).trim() : undefined,
      riseRow: flatPayload.riseRow != null ? Number(flatPayload.riseRow) : undefined,
    };
    const flatForRules = augmentFlatForPromocodeFilters(flatNormalized, realEstateType);

    for (const record of rawList) {
      const attrs = mergeStrapiEntry(record);
      const isActive = attrs.active;
      if (isActive === false || isActive === "false") continue;
      const validFrom = attrs.validFrom;
      const validTo = attrs.validTo;
      if (validFrom && String(validFrom).slice(0, 10) > today) continue;
      if (validTo && String(validTo).slice(0, 10) < today) continue;

      const recordPayment = (attrs.payment ?? "Full") as string;
      if (recordPayment !== paymentNormalized) continue;

      const promocodesList = attrs.promocodes;
      const arr = Array.isArray(promocodesList) ? promocodesList : [];
      const hasCode = arr.some((p: any) => {
        const codeMatch =
          (p?.promocode ?? (p?.attributes?.promocode ?? "")).toString().trim().toUpperCase() === trimmedCode;
        const entryActive = p?.active ?? p?.attributes?.active;
        const entryOk = entryActive !== false && entryActive !== "false";
        return codeMatch && entryOk;
      });
      if (!hasCode) continue;

      const rule = attrs.promocodeRule;
      if (!ruleRealEstateTypeMatches(rule, realEstateType)) {
        continue;
      }

      if (!matchesObjectScope(attrs, realEstateType, objectDocumentId)) {
        continue;
      }

      const value = Number(attrs.value ?? 0) || 0;
      const filters = getFiltersFromRule(rule);
      if (flatMatchesRule(flatForRules, filters, realEstateType)) {
        return NextResponse.json({
          valid: true,
          value,
          code: trimmedCode,
        });
      }
    }

    return NextResponse.json({
      valid: false,
      error: "Промокод не найден или не действует для этой квартиры",
    });
  } catch (err: unknown) {
    console.error("Promocode validate error:", err);
    return NextResponse.json(
      { valid: false, error: "Ошибка проверки промокода" },
      { status: 500 }
    );
  }
}
