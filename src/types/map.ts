export interface Map {
    id: number;
    complexLocation: {
        lat: number;
        lng: number;
    };
    complexName: string;
    complexAddress: string;
    complexHeroImage: string;
    complexClass: string;
    projectSlug: string;
}