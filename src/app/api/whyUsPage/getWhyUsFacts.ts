"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsFactsItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getFacts(): Promise<WhyUsFactsItemData[]> {
  try {
    const res = await apiGet("/api/whyus-facts/?populate=*");

    if (!res.data || res.data.length === 0) return [];

    return res.data.map((item: any) => {
      const img = item.factImage;
      const imgUrl =
        img?.formats?.large?.url ||
        img?.formats?.medium?.url ||
        img?.formats?.small?.url ||
        img?.url ||
        null;

      return {
        id: item.id,
        factTitle: item.factTitle,
        factSubtitle: item.factSubtitle,
        factImage: imgUrl ? `${BACKEND_URL}${imgUrl}` : null,
      };
    });
  } catch (error) {
    console.error("Ошибка загрузки фактов:", error);
    return [];
  }
}

export { getFacts as getWhyUsFacts };