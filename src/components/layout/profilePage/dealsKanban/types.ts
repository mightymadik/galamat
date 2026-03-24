/** Статусы сделок — колонки Kanban */
export const DEAL_STATUS_COLUMNS = [
  "Бронь",
  "Ожидания оплаты",
  "Оплачено",
  "Ожидания договора",
  "Договор подписан",
  "Просрочен",
  "Отменен",
] as const;

export type DealStatusValue = (typeof DEAL_STATUS_COLUMNS)[number];

export interface DealCardItem {
  id: number;
  documentId: string;
  dealStatus: string;
  dealPrice: number | null;
  downPayment: number | null;
  reserveSum: number | null;
  expiresAt: string | null;
  paymentMethod: string | null;
  createdAt: string | null;
  property: {
    documentId: string | null;
    apartmentNumber: string | number;
    projectName: string;
    type?: "property" | "commerce" | "parking" | "pantry";
    typeLabel?: string;
    room?: number;
    totalArea?: number;
  };
  customer: {
    name: string;
    surname: string;
    phone: string;
    displayName: string;
  };
  manager?: { displayName: string } | null;
  nextPayment: { dueDate: string; amount: number } | null;
}

export interface DealFull {
  deal: {
    id?: number;
    documentId: string;
    dealStatus: string;
    dealPrice: number | null;
    downPayment: number | null;
    reserveSum: number | null;
    expiresAt: string | null;
    paymentMethod: string | null;
    realEstateType?: "property" | "commerce" | "parking" | "pantry";
    property: {
      documentId: string;
      projectName: string;
      projectDocumentId?: string;
      apartmentNumber?: string | number;
      totalArea?: number;
      priceCheckmate?: number;
      room?: number;
      house?: number;
      entrance?: string | number;
      section?: string;
      type?: "property" | "commerce" | "parking" | "pantry";
      typeLabel?: string;
    } | null;
    customer: {
      documentId?: string;
      name: string;
      surname: string;
      phone: string;
      email?: string;
      iin?: string | number;
      birthDate?: string;
      docNumber?: string | number;
      docIssuer?: string;
      dateIssue?: string;
      address?: string;
    } | null;
  };
  paymentSchedules: { index: number; dueDate: string; amount: number; paymentStatus: string }[];
  payments: { amount: number; paymentStatus: string; createdAt: string }[];
  signedAgreement: { signed: boolean; signedAt: string | null } | null;
}
