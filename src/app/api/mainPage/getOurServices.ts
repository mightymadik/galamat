"use server";
import { apiGet } from "@/app/api/fetcher";
import { ServiceItemData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getOurServices(): Promise<ServiceItemData[]> {
  try {
    const res = await apiGet(
      "/api/our-services?populate[ourServicesItems][populate]=ourServiceItemImage"
    );

    const root = res.data?.[0];
    if (!root) return [];

    const items = root.ourServicesItems || [];

    return items.map((item: any) => {
      const imageUrl = item.ourServiceItemImage?.url || null;

      return {
        ourServiceTitle: root.ourServiceTitle,
        id: item.id,
        serviceTitle: item.ourServicesItemTitle,
        image: imageUrl ? `${BACKEND_URL}${imageUrl}` : null,
      };
    });
  } catch (error) {
    console.error("Error fetching service data:", error);
    return [];
  }
}