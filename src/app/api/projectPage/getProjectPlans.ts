"use server";
import { apiGet } from "@/app/api/fetcher";
import { ProjectPlansDataItem } from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getProjectPlans(projectSlug?: string): Promise<ProjectPlansDataItem[]> {
  try {
    const params: Record<string, string> = {
      "fields[0]": "complexName",
      "populate[complexPlans][fields][0]": "complexPlansArea",
      "populate[complexPlans][fields][1]": "complexPlansRoom",
      "populate[complexPlans][populate][complexPlansImage][fields][0]": "url",
    };

    if (projectSlug) {
      params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
    }

    const res = await apiGet({
      path: "/api/complexes",
      params,
    });

    const complexes = res?.data ?? [];

    const plans = complexes.flatMap((complex: any) =>
      complex.complexPlans ?? []
    );

    return plans.map((item: any) => {
      const imageUrl = item?.complexPlansImage?.url;

      return {
        id: item.id,
        complexPlansArea: item.complexPlansArea,
        complexPlansRoom: item.complexPlansRoom,
        complexPlansImage: imageUrl ? `${BACKEND_URL}${imageUrl}` : null,
      };
    });
  } catch (error) {
    console.error("Error fetching project plans:", error);
    throw new Error("Service Unavailable");
  }
}

export { getProjectPlans as getProjectPlan };