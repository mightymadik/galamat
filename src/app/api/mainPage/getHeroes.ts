"use server";
import { apiGet } from "@/app/api/fetcher";
import { HeroItemData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getHeroes(): Promise<HeroItemData[]> {
  try {
    const res = await apiGet("/api/heroes?populate=*");

    if (!res.data || !Array.isArray(res.data)) return [];

    const locale = await (await import("@/lib/getLocale")).getLocale();

    const mapped = res.data.map((item: any) => {
      const localized =
        item.locale === locale
          ? item
          : item.localizations?.find((l: any) => l.locale === locale) || item;

      const image = localized.heroImg || item.heroImg;
      const relativeUrl = image?.url || null;

      const sortValue = localized.sort ?? localized.Sort ?? 0;

      return {
        id: localized.id,
        heroTitle: localized.heroTitle || "",
        heroSubtitle: localized.heroSubtitle || null,
        bg: relativeUrl ? `${BACKEND_URL}${relativeUrl}` : null,
        sort: sortValue,
      };
    });

    return mapped.sort((a: HeroItemData, b: HeroItemData) => a.sort - b.sort);
  } catch (error) {
    console.error("Не удалось загрузить данные:", error);
    return [];
  }
}
