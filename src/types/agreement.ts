/** Payment schedule row for agreement generation */
export interface AgreementPaymentRow {
  index: number;
  date: string; // e.g. "01.01.2025"
  sum: string;  // e.g. "19 649 000 ₸"
}

/** Payload passed from payment step to agreement generation */
export interface AgreementPayload {
  paymentMethod: "full" | "installment" | "deffered" | "hypothec";
  /** Итоговая сумма с учётом скидок, Gala Bonus, промокода (число в тенге) */
  totalSum: number;
  /** Сумма за м² (число в тенге) */
  totalSumM2: number;
  /** График платежей */
  paymentSchedule: AgreementPaymentRow[];
  /** Срок сдачи ЖК (для подстановки в договор), e.g. "31.12.2025" */
  agreementProjectDueDate: string;
  /** Код промокода, использованного при оплате (для отметки использования при «Завершить») */
  usedPromocodeCode?: string;
  /** Сумма Gala Bonus, списанная при оплате (для деактивации при «Завершить») */
  usedGalaBonusAmount?: number;
  /** documentId квартиры (для привязки промокода к property при «Завершить») */
  propertyDocumentId?: string;
}
