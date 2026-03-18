import { apiGet } from "@/app/api/fetcher";
import {
  ProjectGenPlanDataItem,
  ProjectPropertyPointsDataItem,
  ProjectAttractionPointsDataItem,
} from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getProjectGenPlan(projectSlug?: string): Promise<ProjectGenPlanDataItem[]> {
  const params: Record<string, string> = {
    "fields[0]": "complexGenPlan",
    "fields[1]": "complexTour",
    "fields[2]": "complexTourProgress",
  };

  if (projectSlug) {
    params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
  }

  const res = await apiGet({
    path: "/api/complexes",
    params,
  });

  if (!res?.data) throw new Error("Service Unavailable");

  return res.data.map((item: any): ProjectGenPlanDataItem => {
    const image = item.complexGenPlan;

    const points = image?.points ?? [];

    const propertyPoints: ProjectPropertyPointsDataItem[] = points
      .filter((p: any) => p.type === "property")
      .map((p: any) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        date: p.date,
        type: p.type,
        floor: p.floor,
        address: p.address,
        section: p.section,
        district: p.district,
        material: p.material,
        property: p.property ?? undefined,
      }));

    const attractionPoints: ProjectAttractionPointsDataItem[] = points
      .filter((p: any) => p.type === "attraction")
      .map((p: any) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        time: p.time,
        type: p.type,
        title: p.title,
        direction: p.direction,
        transport: p.transport,
      }));

    return {
      id: item.id,
      complexGenPlanImage: BACKEND_URL + image?.url,
      propertyPoints,
      attractionPoints,
      complexTour: item.complexTour,
      complexTourProgress: item.complexTourProgress,
    };
  });
}

export { getProjectGenPlan as getProjectGenPlans }