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

/** Option item for installment/deferred selector (has downPayment for % label). raise can be number or string from API. */
export interface PaymentOption {
  downPayment?: string | null;
  raise?: number | string | null;
}

/** Payment condition with optional paymentCondition array */
export interface PaymentConditionWithOptions {
  paymentMethod?: string;
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

/** Скидка за полную оплату из условий (Полная оплата / Full, raise = сумма скидки в ₸) */
export function getFullPaymentDiscountFromConditions(
  paymentConditions: PaymentConditionWithOptions[] | undefined
): number {
  if (!paymentConditions?.length) return 0;
  const full = paymentConditions.find((c) => isPaymentMethod(c, "full") && isActivePaymentStatus(c));
  const options = full?.paymentCondition || [];
  const first = options[0];
  if (!first?.raise) return 0;
  return Number(first.raise) || 0;
}

/** Число из raise (API может вернуть строку) */
export function parseRaise(raise: number | string | null | undefined): number {
  if (raise == null) return 0;
  return typeof raise === "number" ? raise : Number(String(raise).replace(/\s/g, "")) || 0;
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
  totalArea: number
): InstallmentPreview {
  const conditions = (paymentConditions || []).filter(
    (c) =>
      isPaymentMethod(c, "installment") &&
      isActivePaymentStatus(c) &&
      isPaymentConditionValidToday(c)
  );
  const options = conditions
    .flatMap((c) => c.paymentCondition || [])
    .filter((o) => o?.downPayment != null && o?.downPayment !== "");
  const validTo = conditions[0]?.validTo;
  const validToFormatted = formatValidToDate(validTo);
  const selected = options[Math.min(selectedOptionIndex, Math.max(0, options.length - 1))] ?? options[0];
  const raisePerM2 = parseRaise(selected?.raise);
  const fullPrice = baseFullPrice + raisePerM2 * totalArea;
  const firstDownPct = selected
    ? parseDownPaymentPercent(selected.downPayment) || 30
    : FALLBACK_PCTS[Math.min(selectedOptionIndex, FALLBACK_PCTS.length - 1)] ?? 30;
  const firstDown = fullPrice > 0 ? Math.round((fullPrice * firstDownPct) / 100) : 0;
  const now = new Date();
  const validToDate = validTo ? new Date(String(validTo).replace(" ", "T")) : null;
  const months = validToDate && validToDate > now ? monthsBetween(now, validToDate) : 1;
  const monthlyPayment = fullPrice > 0 ? Math.round((fullPrice - firstDown) / months) : 0;
  return {
    options,
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
  totalArea: number
): DefferedPreview {
  const conditions = (paymentConditions || []).filter(
    (c) =>
      isPaymentMethod(c, "deffered") &&
      isActivePaymentStatus(c) &&
      isPaymentConditionValidToday(c)
  );
  const options = conditions
    .flatMap((c) => c.paymentCondition || [])
    .filter((o) => o?.downPayment != null && o?.downPayment !== "");
  const validTo = conditions[0]?.validTo;
  const validToFormatted = formatValidToDate(validTo);
  const selected = options[Math.min(selectedOptionIndex, Math.max(0, options.length - 1))] ?? options[0];
  const raisePerM2 = parseRaise(selected?.raise);
  const fullPrice = baseFullPrice + raisePerM2 * totalArea;
  const firstDownPct = selected
    ? parseDownPaymentPercent(selected.downPayment) || 30
    : FALLBACK_PCTS[Math.min(selectedOptionIndex, FALLBACK_PCTS.length - 1)] ?? 30;
  const firstDown = fullPrice > 0 ? Math.round((fullPrice * firstDownPct) / 100) : 0;
  const remainder = Math.max(0, fullPrice - firstDown);
  return {
    options,
    validToFormatted,
    fullPrice,
    firstDownPct,
    firstDown,
    remainder,
  };
}
