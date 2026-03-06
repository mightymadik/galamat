export interface WhyUsHeroItemData {
  id: number;
  whyUsTitle: string;
  whyUsSubtitle: string;
  whyUsHeroIconTitle: string;
  whyUsHeroItemTitle: string;
  whyUsHeroIcon: string | null;
  whyUsHeroItemImage: string | null;
}

export interface WhyUsAboutItemData {
  id: number;
  whyUsAboutTitle: string;
  whyUsAboutSubtitle: string;
  whyUsAboutDescription: string;
}

export interface WhyUsFactsItemData {
  id: number;
  factTitle: string;
  factSubtitle: string;
  factImage: string;
}

export interface WhyUsBuildsItemData {
  id: number;
  buildsTitle: string;
  buildsImage: string[];
}

export interface WhyUsInfraItemData {
  id: number;
  infraTitle: string;
  infraItemTitle: string;
  infraItemImage: string[];
}

export interface WhyUsHistoryItemData {
  id: number;
  historyTitle: string;
  historyItemYear: string;
  historyItemTitle: string;
  historyItemText: string;
  historyItemImage: string;
}

export interface WhyUsReviewItem {
  id: number;
  reviewItemName: string;
  reviewItemText: string;
  reviewItemSource: string;
  reviewItemStars: number;
  reviewItemImage: string | null;
}

export interface WhyUsReviewsItemData {
  reviewTitle: string;
  reviews: WhyUsReviewItem[];
}

export interface WhyUsOfficeItemData {
  id: number;
  officeTitle: string;
  officeMap: string;
  officeImages: string[];
}