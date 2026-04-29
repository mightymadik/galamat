"use server";

import { apiGet } from "@/app/api/fetcher";
import { CareerTeamData } from "@/types/careerPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getWhyUsHrTeam(): Promise<CareerTeamData[]> {
  try {
    const res = await apiGet("/api/whyus-hr-teams?populate=*");
    if (!Array.isArray(res?.data)) return [];

    return res.data
      .map((item: any) => ({
        id: item.id,
        title: item.title ?? "",
        image: item.image?.url ? `${BACKEND_URL}${item.image.url}` : null,
        sort: item.sort ?? 0,
      }))
      .sort((a: any, b: any) => a.sort - b.sort)
      .map(({ sort, ...item }: any) => item);
  } catch (error) {
    console.error("Failed to fetch HR team", error);
    return [];
  }
}
