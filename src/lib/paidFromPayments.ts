/** Статус подтверждённой оплаты в Strapi (как в payment.content-type). */
export const PAID_PAYMENT_STATUS = "Оплачено";

/**
 * Сумма оплаченного по сделке из фактических записей платежей (не из поля deal.paidAmount).
 */
export function sumPaidFromPaymentRows(
  payments: { amount?: unknown; paymentStatus?: string | null }[] | null | undefined
): number {
  if (!payments?.length) return 0;
  return payments.reduce((acc, p) => {
    if (String(p?.paymentStatus ?? "").trim() !== PAID_PAYMENT_STATUS) return acc;
    const n = Number(p?.amount ?? 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}
