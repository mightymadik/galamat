export interface HeroItemData {
  id: number;
  heroTitle: string;
  heroSubtitle?: string;
  bg: string;
  sort: number;
}

export interface BadgeData {
  id: number;
  title: string;
  image: string;
}

export interface AdvertisementData {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  badges: BadgeData[];
  link?: string;
}

export interface ServiceItemData {
  id: number;
  ourServiceTitle: string;
  serviceTitle: string;
  image: string;
}

export interface ExpectApartmentsData {
  id: number;
  expectApartmentsTitle: string;
  bg: string;
}

export interface SocialMediaData {
  id: number;
  socialMediaTitle: string;
  socialMediaIcon: string;
  socialMediaLink: string;
}

export interface NewsButton {
  id: number;
  buttonText: string;
  buttonLink: string;
}

export interface NewsModalProps {
  contentType: ".mp4" | ".mov" | ".webm" | ".png" | ".jpg" | ".jpeg" | ".webp";
  title?: string;
  date?: string | null;
  imageUrl?: string;
  videoUrl?: string;
  content?: string;
  button?: { link: string; text: string };
}

export interface NewsData {
  id: number;
  newsTitle: string;
  newsSubtitle: string;
  newsDate: string | null;   
  newsImage: string;     
  newsContent: string;   
  newsContentExt?: string;
  newsText: string;
  newsButton?: NewsButton;
  modalProps?: NewsModalProps;
  sort: number;
}

export interface CtaNewsData {
  id: number;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaLink: string;
  ctaImage: string;
}

export interface ResidentsReviewData {
  id: number;
  residentsReviewTitle: string;
  residentsReviewSubtitle: string;
  residentReviewDescription: string;
  residentsReviewDate: string | null;
  residentsReviewAvatarName: string;
  residentsReviewAvatarComplex: string;
  residentsReviewAvatarReview: string;
  residentsReviewAvatar: string | null;
}

export interface PositionNewsData {
  id: number;
  positionTitle: string;
  positionSubtitle: string;
  buttonText: string;
  buttonLink: string;
  positionImg: string;
}