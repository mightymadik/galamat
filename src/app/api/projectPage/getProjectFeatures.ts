"use server";
import { apiGet } from "@/app/api/fetcher";
import { ProjectFeaturesDataItem } from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getProjectFeatures(projectSlug?: string): Promise<ProjectFeaturesDataItem[]> {
  try {
    const params: Record<string, string> = {
      "fields[0]": "complexName",
      "populate[complexFeatures][populate][complexFeaturesItems][populate]": "complexFeaturesImage",
    };

    if (projectSlug) {
      params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
    }

    const res = await apiGet({
      path: "/api/complexes",
      params,
    });

    const complexes = res?.data ?? [];

    const features = complexes.flatMap((complex: any) =>
      complex.complexFeatures ?? []
    );

    return features.map((item: any) => {
      const imageUrl =
        item.complexFeaturesItems?.complexFeaturesImage?.[0]?.url
          ? `${BACKEND_URL}${item.complexFeaturesItems.complexFeaturesImage[0].url}`
          : null;

      return {
        id: item.id,
        complexFeaturesCategory: item.complexFeaturesCategory,
        complexFeaturesTitle: item.complexFeaturesItems?.complexFeaturesTitle ?? "",
        complexFeaturesText: item.complexFeaturesItems?.complexFeaturesText ?? "",
        complexFeaturesImage: imageUrl,
      };
    });
  } catch (error) {
    console.error("Error fetching project features:", error);
    return [];
  }
}

export { getProjectFeatures as getProjectFeature };