import { getProjectsDetails } from "@/features/projectCatalog/getProjectCatalog";
import { ProjectDetail } from "@/types/projectCatalog";
import { getMapData } from "@/app/api/map/map";

export default async function MainPageProjectsServer(): Promise<{
  projects: ProjectDetail[] | null;
  map: any;
}> {
  try {
    const [projects, map] = await Promise.all([
      getProjectsDetails(),
      getMapData()
    ]);

    return {
      projects: projects || null,
      map: map || null
    };
  } catch (error) {
    console.error("Не получилось загрузить данные", error);
    return {
      projects: null,
      map: null
    };
  }
}