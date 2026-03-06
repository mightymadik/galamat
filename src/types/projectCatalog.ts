export interface Flat {
    type: string;
    area: string;
    price: string;
}

export interface ProjectDetail {
    id: string;
    complexName: string;
    complexAddress: string;
    complexDueDate: string;
    complexClass: string;
    complexPaymentMethod: string;
    projectSlug: string;
    previewGallery: string[];
    saleStart: boolean;
    complexHeroPrimaryPromoDate: string;
    flats?: Flat[];
    flatsCount?: number;
}