"use server";
import { apiGet } from "@/app/api/fetcher";
import { SocialMediaData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getSocialMedias(): Promise<SocialMediaData[]> {
  try {
    const res = await apiGet("/api/social-medias/?populate=*");

    const items = res.data || [];

    return items.map((item: any) => {
      const icon = item.socialMediaIcon;
      const relativeUrl =
        icon?.formats?.large?.url ||
        icon?.url ||
        null;

      return {
        id: item.id,
        socialMediaIcon: relativeUrl ? `${BACKEND_URL}${relativeUrl}` : null,
        socialMediaLink: item.socialMediaLink,
        socialMediaTitle: item.socialMediaTitle,
      };
    });
  } catch (error) {
    console.error("Error fetching social media data:", error);
    return [];
  }
}