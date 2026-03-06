"use server";
import { apiGet } from "@/app/api/fetcher";
import { getLocale } from "@/lib/getLocale";
import { HeaderItem } from "@/types/header";

export async function getHeader(): Promise<HeaderItem[]> {
  try {
    const res = await apiGet("/api/header/?populate[Header][populate]=*", true);
    const item = res.data;

    if (!item || !item.Header) return [];

    return item.Header.map((navItem: any) => ({
      id: navItem.id,
      headerTitle: navItem.HeaderTitle,
      headerLink: navItem.HeaderLink,
    }));
  } catch (error) {
    console.error("Не удалось загрузить данные", error);
    return [];
  }
}