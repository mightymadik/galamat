import {
  getHeroes,
  getAdvertisements,
  getOurServices,
  getExpectFlats,
  getSocialMedias,
  getMainNews,
  getMinorNews,
  getResidentReviews,
  getPositionNews
} from "@/services";

export const getMainPageHero = getHeroes;
export const getMainPageAdvertisements = getAdvertisements;
export const getMainPageService = getOurServices;
export const getMainPageExpectApartments = getExpectFlats;
export const getMainPageSocialMedia = getSocialMedias;
export const getMainPageNews = getMainNews;
export const getMainPageCtaNews = getMinorNews;
export const getMainPageResidentsReview = getResidentReviews;
export const getMainPagePositionNews = getPositionNews;