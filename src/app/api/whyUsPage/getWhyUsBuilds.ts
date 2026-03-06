"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsBuildsItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getBuilds(): Promise<WhyUsBuildsItemData[]> {
  try {
    const res = await apiGet("/api/whyus-builds/?populate=*");
    const items = res.data;

    if (!items || items.length === 0) throw new Error("Service Unavailable");

    return items.map((item: any) => {
      const images = Array.isArray(item.buildsImages) ? item.buildsImages : [];

      const imageUrls = images
        .map((img: any) => {
          const imgUrl =
            img?.url ||
            null;

          return imgUrl ? `${BACKEND_URL}${imgUrl}` : null;
        })
        .filter(Boolean);

      return {
        id: item.id,
        buildsTitle: item.buildsTitle,
        buildsImage: imageUrls as string[],
      };
    });
  } catch (error) {
    console.error("Ошибка загрузки строения:", error);
    throw new Error("Service Unavailable");
  }
}

export { getBuilds as getWhyUsBuilds};