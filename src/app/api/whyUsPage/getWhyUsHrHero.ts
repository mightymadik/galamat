"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsHrHeroData } from "@/types/whyUsPage";

export async function getWhyUsHrHero(): Promise<WhyUsHrHeroData | null> {
  try {
    const res = await apiGet("/api/whyus-hr-heroes");
    let item = res?.data?.[0];

    console.log(item);

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
