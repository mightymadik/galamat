// src/types/flat.ts
export type RealEstateType = "property" | "commerce" | "parking" | "pantry";

export interface Flat {
    id: number;
    documentId: string;
    title: string;
    address: string;
    price: number;
    priceM2: number;
    tags: number | string;
    img: number | string;
    room: number | string;
    area: number;
    floor: number;
    section: number | string;
    entrance: number;
    complexDueDate: string;
    available: number | string;
    complexClass: string;
    complexGenPlanImage: string;
    sunshine: string;
    apartmentNumber: number;
    house: number;
    /** Discount amount in ₸ for 100% payment. When set, price is already discounted. */
    fullPaymentDiscount?: number;
    /** Discount as % (e.g. 3 for -3%). */
    discountPercent?: number;
    /** Original price string before discount (e.g. "20 000 000 ₸"). */
    originalPrice?: string;
    /** Base price in ₸ before full-payment discount. Used for installment/deferred (they never use discounted price). */
    fullPriceBeforeDiscount?: number;
    /** Условия оплат по программе (Рассрочка, Отсрочка, Ипотека и т.д.) для этой квартиры */
    paymentConditions?: PaymentConditionForFlat[];
    /** Project documentId for promocode validation */
    projectDocumentId?: string;
    /** Площадь м² (для фильтров условий оплаты и расчёта надбавки за м²) */
    totalArea?: number;
    /** Группа этажей (для фильтров условий оплаты) */
    floorGroup?: string;
}

export interface PaymentConditionForFlat {
    documentId?: string;
    paymentMethod: string;
    banks?: string | null;
    hypothec?: string | null;
    paymentStatus?: string;
    validFrom?: string | null;
    validTo?: string | null;
    paymentCondition?: {
        downPayment?: string | null;
        raise?: number | string | null;
        discount?: number | string | null;
        paymentRule?: { filters?: { field?: string; operator?: string; value?: unknown }[] };
    }[];
}

export interface FlatsFilterParams {
    priceRange?: [number, number];
    pricePerM2Range?: [number, number];
    areaRange?: [number, number];
    entranceRange?: [number, number];
    /** Одна или несколько комнат: ["1", "2"] — показывать 1- и 2-комнатные */
    roomCount?: string[];
    district?: string;
    project?: string; // название ЖК (projectName)
    tags?: string[];
}