"use server";
import { apiGet } from "@/app/api/fetcher";
import { Map } from "@/types/map";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getMapData(): Promise<Map[]> {
  try {
    const res = await apiGet(
      "/api/map-complexes?fields[0]=complexLocation&populate[complexes][fields][0]=complexAddress&populate[complexes][fields][1]=complexName&populate[complexes][fields][2]=complexClass&populate[complexes][fields][3]=projectSlug&populate[complexes][populate][complexHero][populate]=complexHeroImage"
    );

    const rootItems = res.data; // массив локаций
    if (!rootItems || !Array.isArray(rootItems)) return [];

    const result: Map[] = [];

    rootItems.forEach((locationItem: any) => {
      const location = locationItem.complexLocation;
      const complexes = locationItem.complexes || [];

      complexes.forEach((item: any) => {
        const image = item.complexHero?.complexHeroImage;
        const imageUrl = image?.url ? `${BACKEND_URL}${image.url}` : "";

        result.push({
          id: item.id,
          complexLocation: location,
          complexName: item.complexName,
          complexAddress: item.complexAddress,
          complexHeroImage: imageUrl,
          complexClass: item.complexClass,
          projectSlug: item.projectSlug,
        });
      });
    });

    return result;
  } catch (error) {
    console.error("Error fetching map data:", error);
    return [];
  }
}