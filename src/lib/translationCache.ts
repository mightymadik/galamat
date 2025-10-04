"use server";

import NodeCache from "node-cache";
import { GetLanguage } from "@/app/actions/admin/language/get-languages";
const cache = new NodeCache({ stdTTL: 300 }); // պահի 5 րոպե

interface LanguageItem {
  key: string;
  name: string;
}

export const getTranslations = async (lang: string) => {
  const cached = cache.get(lang);
  if (cached) {
    return cached;
  }

  const translations = await GetLanguage(lang);

  const formatted = (translations.data as LanguageItem[]).reduce(
    (acc: Record<string, string>, item) => {
      acc[item.key] = item.name;
      return acc;
    },
    {},
  );

  cache.set(lang, formatted);
  return formatted;
};
