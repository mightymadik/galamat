"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsInfraItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getInfra(): Promise<WhyUsInfraItemData[]> {
  try {
    const res = await apiGet("/api/whyus-infras/?populate[infraItem][populate]=infraItemImage");
    if (!res || !res.data || res.data.length === 0) throw new Error("Service Unavailable");

    const rootItem = res.data[0];

    const items = rootItem.infraItem || [];

    return items.map((item: any) => {
      const images = item.infraItemImage || [];

      const imageUrls = images
        .map((img: any) => {
          const imgUrl =
            img?.formats?.large?.url ||
            img?.formats?.medium?.url ||
            img?.formats?.small?.url ||
            img?.url ||
            null;

          return imgUrl ? `${BACKEND_URL}${imgUrl}` : null;
        })
        .filter(Boolean) as string[];

      return {
        id: item.id,
        infraTitle: rootItem.infraTitle,
        infraItemTitle: item.infraItemTitle,
        infraItemImage: imageUrls,
      };
    });
  } catch (error) {
    console.error("Error fetching infrastructure data:", error);
    throw new Error("Service Unavailable");
  }
}

export { getInfra as getWhyUsInfra };
