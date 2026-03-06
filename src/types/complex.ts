import { Flat } from "@/types/flat";

export interface ComplexFlat {
    type: string;
    area: string;
    price: string;
}

export interface Complex {
    id: number;
    name: string;
    address: string;
    price: string;
    tags: string[];
    backgrounds: string[];
    flatsCount: number;
    flats: ComplexFlat[];
    promo: string;
    code: string;
    complexFlats: Flat[];
}