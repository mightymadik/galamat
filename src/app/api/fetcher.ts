"use server";

import axios from "axios";
import { getLocale } from "@/lib/getLocale";
import { getCity } from "@/lib/getCity";

type ApiGetArgs = string | { path: string; params?: Record<string, string> };
type ApiGetOptions = { skipCityFilter?: boolean; skipLocale?: boolean };

export async function apiGet(
  input: ApiGetArgs,
  optionsOrSkipCityFilter: boolean | ApiGetOptions = false
) {
  const { path, params } =
    typeof input === "string" ? { path: input, params: {} } : input;
  const options: ApiGetOptions =
    typeof optionsOrSkipCityFilter === "boolean"
      ? { skipCityFilter: optionsOrSkipCityFilter }
      : optionsOrSkipCityFilter;
  const skipCityFilter = options.skipCityFilter ?? false;
  const skipLocale = options.skipLocale ?? false;

  const locale = await getLocale();
  const city = await getCity();
  const baseUrl = process.env.STRAPI_URL;

  const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);

  if (!skipLocale && !url.searchParams.has("locale")) {
    url.searchParams.set("locale", locale);
  }

  if (!skipCityFilter && city) {
    url.searchParams.set("filters[$and][0][cities][cityName][$eq]", city);
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    "Accept-Language": locale,
  };
  const apiToken = process.env.STRAPI_API_TOKEN ?? process.env.STRAPI_API_KEY;
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  try {
    const response = await axios.get(url.toString(), { headers });
    return response.data;
  } catch (err: any) {
    throw new Error(err?.message || "Fetch error");
  }
}