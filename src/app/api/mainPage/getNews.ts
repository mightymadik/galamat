"use server";
import { apiGet } from "@/app/api/fetcher";
import { NewsData, CtaNewsData, PositionNewsData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

function getSortValue(item: any) {
  return (
    item.sort ??
    item.Sort ??
    item.localizations?.[0]?.sort ??
    item.localizations?.[0]?.Sort ??
    999999
  );
}

export async function getMainNews(): Promise<NewsData[]> {
  try {
    const res = await apiGet("/api/main-news/?populate=*");

    if (!res || !Array.isArray(res.data)) return [];

    const sortedData = [...res.data].sort(
      (a: any, b: any) => getSortValue(a) - getSortValue(b)
    );

    return sortedData.map((item: any): NewsData => {
      const image = item.mainNewsImage?.[0];
      const content = item.mainNewsContent?.[0];

      const imageUrl =
        image?.formats?.large?.url || image?.url || null;

      const contentUrl =
        content?.formats?.large?.url || content?.url || null;

      const formattedDate = item.mainNewsDate
        ? new Date(item.mainNewsDate).toLocaleDateString("ru-RU")
        : null;

      return {
        id: item.id,
        newsTitle: item.mainNewsTitle,
        newsSubtitle: item.mainNewsSubtitle,
        newsDate: formattedDate,
        newsText: item.mainNewsContentText,
        newsImage: imageUrl ? BACKEND_URL + imageUrl : "",
        newsContent: contentUrl ? BACKEND_URL + contentUrl : "",
        newsContentExt: content?.ext ?? null,
        newsButton: item.mainNewsButton
          ? {
              id: item.mainNewsButton.id,
              buttonText: item.mainNewsButton.mainNewsButtonText,
              buttonLink: item.mainNewsButton.mainNewsButtonLink,
            }
          : undefined,
        sort: getSortValue(item),
      };
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

export async function getMinorNews(): Promise<CtaNewsData[]> {
  try {
    const res = await apiGet("/api/minor-news/?populate=*");

    const item = Array.isArray(res.data) ? res.data[0] : null;
    if (!item) return [];

    const image = item.minorNewsImage;
    const relativeUrl =
      image?.formats?.small?.url ||
      image?.url ||
      null;

    return [{
      id: item.id,
      ctaTitle: item.minorNewsTitle,
      ctaSubtitle: item.minorNewsSubtitle,
      ctaLink: item.minorNewsLink,
      ctaImage: relativeUrl ? `${BACKEND_URL}${relativeUrl}` : '',
    }];
  } catch (error) {
    console.error("Error fetching minor news data:", error);
    return [];
  }
}

export async function getPositionNews(): Promise<PositionNewsData[]> {
  try {
    const res = await apiGet("/api/positions/?populate=*");

    const items = Array.isArray(res.data) ? res.data : [];
    if (!items.length) return [];

    return items.map((item: any): PositionNewsData => {
      const image = item.positionImage;
      const imageUrl = image?.url ? `${BACKEND_URL}${image.url}` : '';

      return {
        id: item.id,
        positionTitle: item.positionTitle,
        positionSubtitle: item.positionSubtitle,
        buttonText: item.positionButtonText,
        buttonLink: item.positionButtonLink,
        positionImg: imageUrl,
      };
    });
  } catch (error) {
    console.error("Error fetching position news data:", error);
    return [];
  }
}