"use server";

import { apiGet } from "@/app/api/fetcher";
import { Footer } from "@/types/footer";

export async function getFooter(): Promise<Footer | null> {
  try {
    const res = await apiGet("/api/footer/?populate[footerItem][populate]=*&populate[footerDocuments][populate]=*", true);
    const data = res?.data;
    if (!data) return null;

    return {
      footerRights: data.footerRights,
      footerDocuments: data.footerDocuments ?? [],
      footerItem: data.footerItem ?? [],
    };
  } catch (error) {
    console.error("Не удалось загрузить footer", error);
    return null;
  }
}