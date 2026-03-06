"use server";
import { apiGet } from "@/app/api/fetcher";
import { AdvertisementData, BadgeData } from "@/types/mainPage";
import { getLocale } from "@/lib/getLocale";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getAdvertisements(): Promise<AdvertisementData | null> {
  try {
    const locale = await getLocale();

    const adRes = await apiGet(
      `/api/advertisements/?populate=*&locale=${locale}`
    );

    const adData = adRes.data?.[0];
    if (!adData) return null;

    const badgesRes = await apiGet(
      `/api/advertisements/?populate[advertisementsBadges][populate]=*&locale=${locale}`
    );

    const badgesData = badgesRes.data?.[0]?.advertisementsBadges || [];

    return {
      id: adData.id,
      title: adData.advertisementsTitle,
      subtitle: adData.advertisementsSubtitle,
      image: adData.advertisementsImage?.url
        ? `${BACKEND_URL}${adData.advertisementsImage.url}`
        : "",
      link: adData.link || null,
      badges: badgesData.map((b: any) => ({
        id: b.id,
        title: b.advertisementsBadgesTitle,
        image: b.advertisementsBadgesIcon
          ? `${BACKEND_URL}${b.advertisementsBadgesIcon.url}`
          : null,
      })),
    };
  } catch (error) {
    console.error("Error fetching advertisement data:", error);
    return null;
  }
}