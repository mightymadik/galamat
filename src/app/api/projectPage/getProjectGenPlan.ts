import { apiGet } from "@/app/api/fetcher";
import {
  ProjectGenPlanDataItem,
  ProjectGenPlanGalleryItem,
  ProjectPropertyPointsDataItem,
  ProjectAttractionPointsDataItem,
} from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

function normalizeComplexGallery(raw: unknown): ProjectGenPlanGalleryItem[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && raw !== null && "data" in raw && Array.isArray((raw as { data: unknown }).data)
      ? ((raw as { data: unknown[] }).data as unknown[])
      : [];
  const base = BACKEND_URL ?? "";
  return list
    .map((entry: unknown) => {
      const m = entry as { url?: string; mime?: string; alternativeText?: string; name?: string };
      const url = m?.url;
      if (!url || typeof url !== "string") return null;
      const fullUrl = url.startsWith("http") ? url : `${base}${url}`;
      return {
        url: fullUrl,
        mime: String(m?.mime ?? ""),
        alt: String(m?.alternativeText ?? m?.name ?? "").trim() || "Gallery",
      };
    })
    .filter((x): x is ProjectGenPlanGalleryItem => x != null);
}

export async function getProjectGenPlan(projectSlug?: string): Promise<ProjectGenPlanDataItem[]> {
  // Media/relation fields must not be listed in `fields` (Strapi 5 returns "Invalid key" for complexGallery there).
  const params: Record<string, string> = {
    "fields[0]": "complexGenPlan",
    "fields[1]": "complexTour",
    "fields[2]": "complexTourProgress",
    "populate[complexGallery][fields][0]": "url",
    "populate[complexGallery][fields][1]": "mime",
    "populate[complexGallery][fields][2]": "alternativeText",
    "populate[complexGallery][fields][3]": "name",
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
      complexGallery: normalizeComplexGallery(item.complexGallery),
    };
  });
}

export { getProjectGenPlan as getProjectGenPlans }