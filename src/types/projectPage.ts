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

export interface ProjectGenPlanDataItem {
  id: number;
  complexGenPlanImage: string;
  propertyPoints: ProjectPropertyPointsDataItem[];
  attractionPoints: ProjectAttractionPointsDataItem[];
  complexTour: string;
  complexTourProgress: string;
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