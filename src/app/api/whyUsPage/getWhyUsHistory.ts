"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsHistoryItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getHistory(): Promise<WhyUsHistoryItemData[]> {
  try {
    const res = await apiGet(
      "/api/whyus-histories/?populate[historyItem][populate]=historyItemImage"
    );

    if (!res || !res.data || res.data.length === 0) return [];

    const rootItem = res.data[0];
    const items = rootItem.historyItem || [];

    return items.map((item: any) => {
      let images = item.historyItemImage;

      // --- ключевое исправление ---
      if (!images) images = [];
      if (!Array.isArray(images)) images = [images];
      // -----------------------------

      const imageUrls = images
        .map((img: any) => {
          if (!img) return null;

          const url =
            img.formats?.large?.url ||
            img.formats?.medium?.url ||
            img.formats?.small?.url ||
            img.url ||
            null;

          return url ? `${BACKEND_URL}${url}` : null;
        })
        .filter(Boolean);

      return {
        id: item.id,
        historyTitle: rootItem.historyTitle,
        historyItemTitle: item.historyItemTitle,
        historyItemYear: item.historyItemYear,
        historyItemText: item.historyItemText,
        historyItemImage: imageUrls,
      };
    });
  } catch (error) {
    console.error("Error fetching history data:", error);
    return [];
  }
}

export { getHistory as getWhyUsHistory };