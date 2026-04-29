"use server";

import { apiGet } from "@/app/api/fetcher";
import { CareerHeroData } from "@/types/careerPage";

export async function getWhyUsHrHero(): Promise<CareerHeroData | null> {
  try {
    const res = await apiGet("/api/whyus-hr-heroes");
    const item = res?.data?.[0];

    if (!item) return null;

    return {
      id: item.id,
      title: item.title ?? "",
      videoLink: item.videoLink ?? "",
    };
  } catch (error) {
    console.error("Failed to fetch HR hero", error);
    return null;
  }
}
