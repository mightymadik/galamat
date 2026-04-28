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

export interface WhyUsHrHeroData {
  id: number;
  title: string;
  videoLink: string;
}

export interface WhyUsHrNumberData {
  id: number;
  icon: string | null;
  title: string;
  description: string;
  bgImage: string | null;
}

export interface WhyUsHrTeamData {
  id: number;
  title: string;
  image: string | null;
}

export interface WhyUsHrConditionData {
  id: number;
  icon: string | null;
  title: string;
}

export interface WhyUsHrStageData {
  id: number;
  number: number;
  icon: string | null;
  title: string;
}