"use server";
import { apiGet } from "@/app/api/fetcher";
import { ProjectServicesDataItem } from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getProjectServices(projectSlug?: string): Promise<ProjectServicesDataItem[]> {
  try {
    const params: Record<string, string> = {
      "fields[0]": "complexName",
      "populate[complexServices][populate]": "*",
    };

    if (projectSlug) {
      params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
    }

    const res = await apiGet({
      path: "/api/complexes",
      params,
    });

    const complexes = res?.data ?? [];

    const services = complexes.flatMap((complex: any) => complex.complexServices ?? []);

    return services.map((item: any) => {
      const imageUrl = item?.complexServicesIcon?.url;

      return {
        id: item.id,
        complexServicesTitle: item.complexServicesTitle,
        complexServicesText: item.complexServicesText,
        complexServicesIcon: imageUrl ? `${BACKEND_URL}${imageUrl}` : null,
      };
    });
  } catch (error) {
    console.error("Error fetching project services:", error);
    return [];
  }
}

export { getProjectServices as getProjectService };