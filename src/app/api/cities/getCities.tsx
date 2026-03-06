"use server";
import { apiGet } from "@/app/api/fetcher";
import { Cities } from "@/types/cities";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getCities(): Promise<Cities[]> {
  try {
    const res = await apiGet("/api/cities");

    const items = res.data || [];

    return items.map((item: any) => {
      return {
        id: item.id,
        cityName: item.cityName
      };
    });
  } catch (error) {
    console.error("Error fetching city data:", error);
    throw new Error("Service Unavailable");
  }
}