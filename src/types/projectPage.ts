export interface ProjectHeroDataItem {
  id: string;
  complexName: string;
  complexAddress: string;
  complexHeroImage: string;
  complexHeroBadge: string[];
  saleStart: boolean;
  complexHeroPrimaryPromoDate: string;
  complexHeroPrimaryPromoTitle: string;
  complexHeroPrimaryPromoSubtitle: string;
  complexHeroPrimaryPromoIcon: string;
  complexHeroSecondaryPromoTitle: string;
  complexHeroSecondaryPromoSubtitle: string;
  complexHeroSecondaryPromoIcon: string;
  complexHeroVideo: string;
  complexHeroBooklet: string;
}

export interface ProjectAboutSmall {
  id: number;
  complexAboutItemsSmallTitle: string;
  complexAboutItemsSmallImage: string;
}

export interface ProjectAboutLarge {
  id: number;
  complexAboutItemsLargeTitle: string;
  complexAboutItemsLargeImage: string;
}

export interface ProjectAboutDataItem {
  id: number;
  complexAboutTitle: string;
  complexAboutSubtitle: string;
  complexAboutItemsSmall: ProjectAboutSmall[];
  complexAboutItemsLarge: ProjectAboutLarge[];
}

/** Строка в тултипе генплана (квартиры по типам и т.п.) */
export interface GenPlanApartmentPreviewRow {
  title: string;
  available?: string;
  priceFrom?: string;
  /** Машино-места / кладовые — только подпись слева */
  planned?: boolean;
}

/**
 * Сгруппированные строки с точки генплана: поле `property` в JSON точки (coords).
 * Пример: [{ "title": "1-комнатные", "available": "3 доступно", "priceFrom": "от 25 млн ₸" }, { "title": "Машино-места", "planned": true }]
 * Либо: { "title": "...", "count": 3, "minPrice": 25000000 }
 */
export type GenPlanPropertyPointGrouped = Record<string, unknown>;

export interface ProjectPropertyPointsDataItem {
  id: number;
  x: number;
  y: number;
  date: string;
  type: string;
  floor: string;
  address: string;
  section: string;
  district: string;
  material: string;
  /** Массив групп с админки (точка property на генплане) */
  property?: GenPlanPropertyPointGrouped[] | string | null;
  apartmentPreview?: GenPlanApartmentPreviewRow[];
}

export interface ProjectAttractionPointsDataItem {
  id: number;
  x: number;
  y: number;
  time: string;
  type: string;
  title: string;
  direction: string;
  transport: string;
}

export interface ProjectGenPlanGalleryItem {
  url: string;
  mime: string;
  alt: string;
}

export interface ProjectGenPlanDataItem {
  id: number;
  complexGenPlanImage: string;
  propertyPoints: ProjectPropertyPointsDataItem[];
  attractionPoints: ProjectAttractionPointsDataItem[];
  complexTour: string;
  complexTourProgress: string;
  complexGallery: ProjectGenPlanGalleryItem[];
}

export interface ProjectPlansDataItem {
  id: number;
  complexPlansArea: number;
  complexPlansRoom: number;
  complexPlansImage: string;
}

export interface ProjectFeaturesDataItem {
  id: number;
  complexFeaturesCategory: string;
  complexFeaturesTitle: string;
  complexFeaturesText: string;
  complexFeaturesImage: string;
}

export interface ProjectServicesDataItem {
  id: number;
  complexServicesTitle: string;
  complexServicesText: string;
  complexServicesIcon: string;
}