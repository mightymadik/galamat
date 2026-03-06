"use server";

import { apiGet } from "@/app/api/fetcher";
import { AvailableProjects } from "@/types/footer";

export async function getAvailableProjects(): Promise<AvailableProjects[] | null> {
  try {
    const res = await apiGet("/api/complexes/?fields[0]=complexName&fields[1]=projectSlug", true);
    const data = res?.data;

    if (!data || !Array.isArray(data)) return null;

    // Преобразуем массив
    return data.map(item => ({
      id: item.id,
      projectName: item.complexName,
      projectSlug: item.projectSlug,
    }));
  } catch (error) {
    console.error("Не удалось загрузить данные", error);
    return null;
  }
}