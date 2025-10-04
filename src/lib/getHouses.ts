// lib/getHouses.ts
import { cache } from "./cache";
import { GetProjects } from "@/utils/api";

const CACHE_KEY = "projects";

export async function fetchHouses() {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const res = await GetProjects({});
    const filteredProjects = res.data.filter(
      (project: IProjectStage) => project.archiveState === "NOT_ARCHIVED",
    );

    cache.set(CACHE_KEY, filteredProjects);
    return filteredProjects;
  } catch (e) {
    console.error("Error fetching houses:", e);
    return [];
  }
}
