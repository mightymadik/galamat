import { apiGet } from "@/app/api/fetcher";
import {
  ProjectGenPlanDataItem,
  ProjectGenPlanGalleryItem,
  ProjectComplexGalleryData,
  GALLERY_CATEGORY_KEYS,
  emptyProjectComplexGallery,
  ProjectPropertyPointsDataItem,
  ProjectAttractionPointsDataItem,
} from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

function normalizeMediaArray(raw: unknown): ProjectGenPlanGalleryItem[] {
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

function normalizeComponentArray(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "object" && raw !== null && "data" in raw && Array.isArray((raw as { data: unknown[] }).data)) {
    return (raw as { data: unknown[] }).data as Record<string, unknown>[];
  }
  return [];
}

/** Повторяемый компонент `gallery.galereya`: объединяем медиа всех записей по полям yard, hall, facade, alley. */
function mergeComplexGallery(raw: unknown): ProjectComplexGalleryData {
  const out = emptyProjectComplexGallery();
  for (const entry of normalizeComponentArray(raw)) {
    for (const key of GALLERY_CATEGORY_KEYS) {
      const field = entry[key];
      out[key].push(...normalizeMediaArray(field));
    }
  }
  return out;
}

function buildComplexGalleryPopulateParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const mediaFields = ["url", "mime", "alternativeText", "name"];
  for (const key of GALLERY_CATEGORY_KEYS) {
    mediaFields.forEach((f, i) => {
      params[`populate[complexGallery][populate][${key}][fields][${i}]`] = f;
    });
  }
  return params;
}

export async function getProjectGenPlan(projectSlug?: string): Promise<ProjectGenPlanDataItem[]> {
  const params: Record<string, string> = {
    "fields[0]": "complexGenPlan",
    "fields[1]": "complexTour",
    "fields[2]": "complexTourProgress",
    ...buildComplexGalleryPopulateParams(),
  };

  if (projectSlug) {
    params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
  }

  const res = await apiGet({
    path: "/api/complexes",
    params,
  });

  if (!Array.isArray(res?.data)) return [];

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
      complexGallery: mergeComplexGallery(item.complexGallery),
    };
  });
}

export { getProjectGenPlan as getProjectGenPlans };
