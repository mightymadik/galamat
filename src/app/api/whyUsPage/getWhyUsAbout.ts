"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsAboutItemData } from "@/types/whyUsPage";

export async function getAbout(): Promise<WhyUsAboutItemData[]> {
  try {
    const res = await apiGet("/api/whyus-abouts");
    const root = res.data?.[0];
    if (!root) return [];

    return [
      {
        id: root.id,
        whyUsAboutTitle: root.aboutTitle,
        whyUsAboutSubtitle: root.aboutSubtitle,
        whyUsAboutDescription: root.aboutDescription,
      },
    ];
  } catch (error) {
    console.error("Ошибка загрузки whyUsAbout:", error);
    return [];
  }
}

export { getAbout as getWhyUsAbout };