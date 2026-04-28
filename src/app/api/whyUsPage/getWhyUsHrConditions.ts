"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsHrConditionData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getWhyUsHrConditions(): Promise<WhyUsHrConditionData[]> {
  try {
    const res = await apiGet("/api/whyus-hr-conditions?populate=*");
    if (!Array.isArray(res?.data)) return [];

    return res.data
      .map((item: any) => ({
        id: item.id,
        icon: item.icon?.url ? `${BACKEND_URL}${item.icon.url}` : null,
        title: item.title ?? "",
        sort: item.sort ?? 0,
      }))
      .sort((a: any, b: any) => a.sort - b.sort)
      .map(({ sort, ...item }: any) => item);
  } catch (error) {
    console.error("Failed to fetch HR conditions", error);
    return [];
  }
}
