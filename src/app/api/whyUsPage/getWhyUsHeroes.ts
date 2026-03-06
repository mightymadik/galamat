"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsHeroItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getWhyUsHeroes(): Promise<WhyUsHeroItemData[]> {
  try {
    const res = await apiGet(
      "/api/whyus-heroes?populate[whyUsHeroItems][populate]=*"
    );

    if (!res.data || res.data.length === 0) throw new Error("Service Unavailable");

    const root = res.data[0]; // Single Type → один объект

    const items = root.whyUsHeroItems || [];

    return items.map((item: any) => {
      const iconUrl = item.whyUsHeroIcon?.url || null;

      const img = item.whyUsHeroItemImage;
      const imgUrl =
        img?.formats?.large?.url ||
        img?.formats?.medium?.url ||
        img?.formats?.small?.url ||
        img?.url ||
        null;

      return {
        id: item.id,
        whyUsTitle: root.whyUsTitle,
        whyUsSubtitle: root.whyUsSubtitle,
        whyUsHeroIconTitle: item.whyUsHeroIconTitle,
        whyUsHeroItemTitle: item.whyUsHeroItemTitle,

        whyUsHeroIcon: iconUrl ? `${BACKEND_URL}${iconUrl}` : null,
        whyUsHeroItemImage: imgUrl ? `${BACKEND_URL}${imgUrl}` : null,
      };
    });
  } catch (error) {
    console.error("Ошибка загрузки whyUsHero:", error);
    throw new Error("Service Unavailable");
  }
}