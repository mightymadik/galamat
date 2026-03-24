/**
 * Shared helpers for payment modal (Full, Installment, Deffered) and flat detail.
 */

export const PROMO_LENGTH = 8;

/** Allow Latin letters and digits only (A–Z, a–z, 0–9), max 8 chars, uppercase */
export function formatPromoInput(value: string): string {
  const allowed = value.replace(/[^A-Za-z0-9]/g, "");
  return allowed.toUpperCase().slice(0, PROMO_LENGTH);
}

/** Parse bonus string (e.g. "200.00" or "200000") to number */
export function parseBonusAmount(bonus: string | undefined): number {
  if (bonus == null || bonus === "") return 0;
  return parseFloat(String(bonus).replace(/\s/g, "").replace(",", ".")) || 0;
}

/** Format number to price display "200 000 ₸" */
export function formatPriceDisplay(amount: number): string {
  return `${amount.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
}

/** Format bonus value (e.g. "200.00" or "200000") to display "200 000 ₸" */
export function formatGalaBonusDisplay(bonus: string | undefined): string {
  return formatPriceDisplay(parseBonusAmount(bonus));
}

/** Alias for same format */
export function formatMoney(n: number): string {
  return formatPriceDisplay(n);
}

/** Parse price string (e.g. "19 649 000 ₸") to number */
export function parsePriceString(price: string | undefined): number {
  if (!price || typeof price !== "string") return 0;
  const digits = price.replace(/\s/g, "").replace(/[^\d.,]/g, "").replace(",", ".");
  return parseFloat(digits) || 0;
}

/** Parse price: digits only from string */
export function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  return Number(priceStr.replace(/\D/g, "")) || 0;
}

/** Format complexDueDate string to locale date (e.g. "31.12.2025") */
export function formatComplexDueDate(value: string | undefined): string {
  if (!value || typeof value !== "string") return "";
  try {
    const normalized = value.trim().replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

/** Извлекает процент из "ПВ 30%", "30%", "30" и т.д. */
export function parseDownPaymentPercent(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const s = String(val).trim();
  const match = s.match(/(\d+)/);
  return match ? Math.min(100, parseInt(match[1], 10)) : 0;
}

/** Числовое значение ПВ: 1..100 = проценты, >=101 = фиксированная сумма в тенге. */
export function parseDownPaymentValue(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const s = String(val).trim().replace(/\s/g, "");
  const match = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  const n = Number(match[1].replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Рассчитывает сумму первоначального взноса из ПВ (процент/фикс). */
export function resolveDownPaymentAmount(
  downPaymentRaw: string | number | null | undefined,
  totalPrice: number
): number {
  const value = parseDownPaymentValue(downPaymentRaw);
  if (!Number.isFinite(value) || value <= 0 || totalPrice <= 0) return 0;
  if (value >= 1 && value <= 100) return Math.round((totalPrice * value) / 100);
  return Math.round(Math.min(value, totalPrice));
}

/** Текстовый лейбл ПВ для UI. */
export function formatDownPaymentLabel(
  downPaymentRaw: string | number | null | undefined
): string {
  const value = parseDownPaymentValue(downPaymentRaw);
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 1 && value <= 100) return `${Math.round(value)}%`;
  return `${formatPriceDisplay(Math.round(value))}`;
}

/** Число полных месяцев между датами (минимум 1) */
export function monthsBetween(from: Date, to: Date): number {
  const m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(1, m);
}

/** true if condition is valid today: validFrom <= today and (no validTo or today <= validTo) */
export function isPaymentConditionValidToday(c: { validFrom?: string | null; validTo?: string | null }): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (c.validFrom != null && String(c.validFrom).trim() !== "") {
    const from = new Date(String(c.validFrom).replace(" ", "T"));
    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      if (from.getTime() > today.getTime()) return false;
    }
  }

  if (c.validTo != null && String(c.validTo).trim() !== "") {
    const to = new Date(String(c.validTo).replace(" ", "T"));
    if (!Number.isNaN(to.getTime())) {
      to.setHours(0, 0, 0, 0);
      if (today.getTime() > to.getTime()) return false;
    }
  }

  return true;
}

/** Format validTo date string to "dd.mm.yyyy" for display */
export function formatValidToDate(validTo: string | null | undefined): string {
  if (!validTo) return "";
  const d = new Date(String(validTo).replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Один фильтр правила (как на бэкенде). */
export interface PaymentRuleFilter {
  field?: string;
  operator?: string;
  value?: unknown;
}

/** Option item for installment/deferred selector (has downPayment for % label). raise can be number or string from API. */
export interface PaymentOption {
  downPayment?: string | null;
  raise?: number | string | null;
  discount?: number | string | null;
  /** Правило попадания квартиры в это условие (для выбора условия по атрибутам квартиры). */
  paymentRule?: { filters?: PaymentRuleFilter[] };
}

/** Payment condition with optional paymentCondition array */
export interface PaymentConditionWithOptions {
  paymentMethod?: string;
  banks?: string | null;
  hypothec?: string | null;
  paymentStatus?: string;
  validFrom?: string | null;
  validTo?: string | null;
  paymentCondition?: PaymentOption[];
}

/** Внутренние ключи типов оплаты */
export type PaymentMethodKey = "full" | "installment" | "deffered" | "hypothec";

/** Соответствие paymentMethod из API (рус/англ) внутреннему ключу */
const PAYMENT_METHOD_MAP: Record<string, PaymentMethodKey> = {
  Full: "full",
  "Полная оплата": "full",
  Installment: "installment",
  "Рассрочка": "installment",
  Deffered: "deffered",
  "Отложенный платеж": "deffered",
  Hypothec: "hypothec",
  "Ипотека": "hypothec",
};

/** Проверка, что условие относится к типу оплаты (по русскому или английскому значению) */
export function isPaymentMethod(
  c: { paymentMethod?: string } | undefined,
  key: PaymentMethodKey
): boolean {
  if (!c?.paymentMethod) return false;
  return PAYMENT_METHOD_MAP[c.paymentMethod.trim()] === key;
}

/** Статус "Active" / "Активный" считаем активным */
export function isActivePaymentStatus(c: { paymentStatus?: string } | undefined): boolean {
  const s = (c?.paymentStatus || "").trim().toLowerCase();
  return s === "active" || s === "активный";
}

/** Поля, по которым сравнение делаем числовое (в т.ч. "44,6" с бэка → 44.6). */
const NUMERIC_FILTER_FIELDS = new Set([
  "totalArea",
  "floor",
  "entrance",
  "room",
  "apartmentNumber",
  "house",
  "riseRow",
]);

function parseFilterNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Проверяет, подходит ли квартира под фильтры условия. Пустые фильтры = подходит любая квартира; иначе все фильтры должны совпасть строго. */
export function matchFlatToConditionFilters(
  flatAttrs: Record<string, unknown> | undefined,
  filters: PaymentRuleFilter[] | undefined
): boolean {
  if (!flatAttrs) return false;
  if (!filters?.length) return true;
  for (const f of filters) {
    if (!f.field) continue;
    const flatVal = flatAttrs[f.field];
    const condVal = f.value;
    const op = (f.operator || "$eq") as string;
    const isNumeric = NUMERIC_FILTER_FIELDS.has(f.field);
    let match = false;

    if (isNumeric) {
      const flatNum = parseFilterNumber(flatVal);
      const condNum = parseFilterNumber(condVal);
      if (condNum === null) {
        match = flatNum === null;
      } else if (flatNum === null) {
        match = false;
      } else {
        const eps = 0.001;
        switch (op) {
          case "$eq":
            match = Math.abs(flatNum - condNum) < eps;
            break;
          case "$ne":
            match = Math.abs(flatNum - condNum) >= eps;
            break;
          case "$gte":
            match = flatNum >= condNum - eps;
            break;
          case "$gt":
            match = flatNum > condNum + eps;
            break;
          case "$lte":
            match = flatNum <= condNum + eps;
            break;
          case "$lt":
            match = flatNum < condNum - eps;
            break;
          default:
            match = Math.abs(flatNum - condNum) < eps;
        }
      }
    } else {
      const flatStr = String(flatVal ?? "").trim();
      const condStr = String(condVal ?? "").trim();
      if (op === "$eq") match = flatStr === condStr;
      else if (op === "$ne") match = flatStr !== condStr;
      else match = flatStr === condStr;
    }
    if (!match) return false;
  }
  return true;
}

const filterCount = (opt: PaymentOption) => (opt.paymentRule?.filters ?? []).filter((f) => f.field).length;

/** Все условия (options), под которые квартира подходит: строго по фильтрам; условия без фильтров подходят всем. Если ни одно с фильтрами не подошло — только варианты без фильтров; если и таких нет — пустой массив (не показываем неподходящие). */
export function getMatchingOptions<T extends PaymentOption>(
  options: T[],
  flatAttrs: Record<string, unknown> | undefined
): T[] {
  if (!options.length) return [];
  if (!flatAttrs) return options;
  const sorted = [...options].sort((a, b) => filterCount(b as PaymentOption) - filterCount(a as PaymentOption));
  const matching = sorted.filter((opt) =>
    matchFlatToConditionFilters(flatAttrs, (opt as PaymentOption).paymentRule?.filters)
  );
  if (matching.length > 0) return matching;
  const noFilterOptions = sorted.filter((opt) => filterCount(opt as PaymentOption) === 0);
  return noFilterOptions;
}

/** Первое условие (option), под которое подходит квартира по фильтрам; при отсутствии совпадений — вариант без фильтров или первый в списке. */
export function getMatchingOption<T extends PaymentOption>(
  options: T[],
  flatAttrs: Record<string, unknown> | undefined
): T | undefined {
  if (!options.length) return undefined;
  if (!flatAttrs) return options[0];
  const matching = getMatchingOptions(options, flatAttrs);
  return matching[0];
}

/**
 * Интерпретация значения скидки по полной оплате (raise):
 * - 1–100: процент от стоимости → discount = basePrice * (value / 100)
 * - 101–50_000: за м² → discount = value * totalArea
 * - 50_001 и выше: от стоимости (уже в ₸) → discount = value
 */
export function resolveFullPaymentDiscountValue(
  rawValue: number,
  basePrice: number,
  totalArea: number
): number {
  if (rawValue <= 0 || !Number.isFinite(rawValue)) return 0;
  if (rawValue >= 1 && rawValue <= 100) {
    return basePrice > 0 ? Math.round((basePrice * rawValue) / 100) : 0;
  }
  if (rawValue >= 101 && rawValue <= 50_000) {
    return totalArea > 0 ? Math.round(rawValue * totalArea) : 0;
  }
  if (rawValue >= 50_001) {
    return Math.round(rawValue);
  }
  return 0;
}

/** Скидка за полную оплату из условий (Полная оплата / Full). Используем discount, fallback на legacy raise. */
export function getFullPaymentDiscountFromConditions(
  paymentConditions: PaymentConditionWithOptions[] | undefined,
  basePrice: number,
  totalArea: number,
  flatAttrs?: Record<string, unknown>
): number {
  if (!paymentConditions?.length) return 0;
  const full = paymentConditions.find((c) => isPaymentMethod(c, "full") && isActivePaymentStatus(c));
  const options = (full?.paymentCondition || []) as PaymentOption[];
  const option = getMatchingOption(options, flatAttrs);
  const raw = parseRaise(option?.discount ?? option?.raise);
  if (!raw) return 0;
  return resolveFullPaymentDiscountValue(raw, basePrice, totalArea);
}

/** Число из raise (API может вернуть строку) */
export function parseRaise(raise: number | string | null | undefined): number {
  if (raise == null) return 0;
  return typeof raise === "number" ? raise : Number(String(raise).replace(/\s/g, "")) || 0;
}

/**
 * Интерпретация значения скидки промокода:
 * - 1–100: процент от стоимости
 * - 101–50_000: скидка за м² (value * totalArea)
 * - 50_001 и выше: фиксированная скидка от стоимости
 */
export function resolvePromocodeDiscountValue(
  rawValue: number | null | undefined,
  basePrice: number,
  totalArea: number
): number {
  const value = Number(rawValue ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1 && value <= 100) {
    return basePrice > 0 ? Math.round((basePrice * value) / 100) : 0;
  }
  if (value >= 101 && value <= 50_000) {
    return totalArea > 0 ? Math.round(value * totalArea) : 0;
  }
  return Math.round(value);
}

const FALLBACK_PCTS = [30, 50, 70] as const;

/** Installment preview for flat detail page: options, validTo, full price, first down, monthly payment */
export interface InstallmentPreview {
  options: PaymentOption[];
  validToFormatted: string;
  fullPrice: number;
  firstDownPct: number;
  firstDown: number;
  monthlyPayment: number;
}

export function getInstallmentPreview(
  paymentConditions: PaymentConditionWithOptions[] | undefined,
  selectedOptionIndex: number,
  baseFullPrice: number,
  totalArea: number,
  flatAttrs?: Record<string, unknown>
): InstallmentPreview {
  const conditions = (paymentConditions || []).filter(
    (c) =>
      isPaymentMethod(c, "installment") &&
      isActivePaymentStatus(c) &&
      isPaymentConditionValidToday(c)
  );
  const options = conditions
    .flatMap((c) => c.paymentCondition || [])
    .filter((o) => o?.downPayment != null && o?.downPayment !== "") as PaymentOption[];
  const validTo = conditions[0]?.validTo;
  const validToFormatted = formatValidToDate(validTo);
  const optionList = flatAttrs ? getMatchingOptions(options, flatAttrs) : options;
  const selected = optionList[Math.min(selectedOptionIndex, Math.max(0, optionList.length - 1))] ?? optionList[0];
  const raisePerM2 = parseRaise(selected?.raise);
  const fullPrice = baseFullPrice + raisePerM2 * totalArea;
  const fallbackPct = FALLBACK_PCTS[Math.min(selectedOptionIndex, FALLBACK_PCTS.length - 1)] ?? 30;
  const firstDown = selected
    ? resolveDownPaymentAmount(selected.downPayment, fullPrice)
    : (fullPrice > 0 ? Math.round((fullPrice * fallbackPct) / 100) : 0);
  const firstDownPct = fullPrice > 0 ? Math.round((firstDown / fullPrice) * 100) : fallbackPct;
  const now = new Date();
  const validToDate = validTo ? new Date(String(validTo).replace(" ", "T")) : null;
  const months = validToDate && validToDate > now ? monthsBetween(now, validToDate) : 1;
  const monthlyPayment = fullPrice > 0 ? Math.round((fullPrice - firstDown) / months) : 0;
  return {
    options: optionList,
    validToFormatted,
    fullPrice,
    firstDownPct,
    firstDown,
    monthlyPayment,
  };
}

/** Deferred preview for flat detail page: options, validTo, full price, first down, remainder */
export interface DefferedPreview {
  options: PaymentOption[];
  validToFormatted: string;
  fullPrice: number;
  firstDownPct: number;
  firstDown: number;
  remainder: number;
}

export function getDefferedPreview(
  paymentConditions: PaymentConditionWithOptions[] | undefined,
  selectedOptionIndex: number,
  baseFullPrice: number,
  totalArea: number,
  flatAttrs?: Record<string, unknown>
): DefferedPreview {
  const conditions = (paymentConditions || []).filter(
    (c) =>
      isPaymentMethod(c, "deffered") &&
      isActivePaymentStatus(c) &&
      isPaymentConditionValidToday(c)
  );
  const options = conditions
    .flatMap((c) => c.paymentCondition || [])
    .filter((o) => o?.downPayment != null && o?.downPayment !== "") as PaymentOption[];
  const validTo = conditions[0]?.validTo;
  const validToFormatted = formatValidToDate(validTo);
  const optionList = flatAttrs ? getMatchingOptions(options, flatAttrs) : options;
  const selected = optionList[Math.min(selectedOptionIndex, Math.max(0, optionList.length - 1))] ?? optionList[0];
  const raisePerM2 = parseRaise(selected?.raise);
  const fullPrice = baseFullPrice + raisePerM2 * totalArea;
  const fallbackPct = FALLBACK_PCTS[Math.min(selectedOptionIndex, FALLBACK_PCTS.length - 1)] ?? 30;
  const firstDown = selected
    ? resolveDownPaymentAmount(selected.downPayment, fullPrice)
    : (fullPrice > 0 ? Math.round((fullPrice * fallbackPct) / 100) : 0);
  const firstDownPct = fullPrice > 0 ? Math.round((firstDown / fullPrice) * 100) : fallbackPct;
  const remainder = Math.max(0, fullPrice - firstDown);
  return {
    options: optionList,
    validToFormatted,
    fullPrice,
    firstDownPct,
    firstDown,
    remainder,
  };
}
