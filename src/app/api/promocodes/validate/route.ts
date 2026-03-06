"use server";

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
    case "$gt": return numFlat > numFilter;
    case "$gte": return numFlat >= numFilter;
    case "$lt": return numFlat < numFilter;
    case "$lte": return numFlat <= numFilter;
    default: return false;
  }
}

function flatMatchesRule(flat: FlatForValidation, filters: FilterRow[] | undefined): boolean {
  if (!filters || filters.length === 0) return true;
  for (const row of filters) {
    if (!row.field || (row.value !== 0 && row.value !== "0" && !row.value)) continue;
    const flatVal = flat[row.field] ?? flat[row.field as keyof FlatForValidation];
    if (!applyOperator(flatVal, row.operator || "$eq", row.value)) return false;
  }
  return true;
}

/** Достаём filters из promocodeRule (JSON или вложенная структура Strapi) */
function getFiltersFromRule(rule: unknown): FilterRow[] {
  if (!rule || typeof rule !== "object") return [];
  const r = rule as Record<string, unknown>;
  let list = r.filters ?? (r as any).attributes?.filters ?? (r as any).data?.attributes?.filters;
  if (Array.isArray(list)) return list as FilterRow[];
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, projectDocumentId, flat, payment } = body as {
      code?: string;
      projectDocumentId?: string;
      flat?: FlatForValidation;
      /** Payment type: Full | Installment | Deferred. Promocode is valid only if its payment matches. */
      payment?: string;
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

    const params: Record<string, string> = {
      "filters[project][documentId][$eq]": projectDocumentId,
      "pagination[pageSize]": "100",
      "populate[project][fields][0]": "documentId",
      "populate[promocodes][populate]": "*",
    };

    const query = new URLSearchParams(params).toString();
    const res = await axios.get(`${base}/api/promocodes?${query}`, {
      headers: h,
      timeout: 10000,
      validateStatus: () => true,
    });

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

    for (const record of rawList) {
      const attrs = record?.attributes ?? record;
      const isActive = attrs?.active ?? record?.active;
      if (isActive === false || isActive === "false") continue;
      const validFrom = attrs?.validFrom ?? record?.validFrom;
      const validTo = attrs?.validTo ?? record?.validTo;
      if (validFrom && String(validFrom).slice(0, 10) > today) continue;
      if (validTo && String(validTo).slice(0, 10) < today) continue;

      const recordPayment = (attrs?.payment ?? record?.payment ?? "Full") as string;
      if (recordPayment !== paymentNormalized) continue;

      const promocodesList = attrs?.promocodes ?? record?.promocodes;
      const arr = Array.isArray(promocodesList) ? promocodesList : [];
      // Учитываем только записи с активным кодом (не использованным)
      const hasCode = arr.some((p: any) => {
        const codeMatch =
          (p?.promocode ?? (p?.attributes?.promocode ?? "")).toString().trim().toUpperCase() === trimmedCode;
        const entryActive = p?.active ?? p?.attributes?.active;
        const isActive = entryActive !== false && entryActive !== "false";
        return codeMatch && isActive;
      });
      if (!hasCode) continue;

      const value = Number(attrs?.value ?? record?.value ?? 0) || 0;
      const rule = attrs?.promocodeRule ?? record?.promocodeRule;
      const filters = getFiltersFromRule(rule);
      if (flatMatchesRule(flatNormalized, filters)) {
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
