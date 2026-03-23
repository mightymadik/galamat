import { cookies } from "next/headers";

const SUPPORTED_LOCALES = new Set(["ru", "kk"]);

export async function getLocale() {
  const cookieStore = await cookies();
  const rawLocale = (cookieStore.get("locale")?.value || "ru").toLowerCase();
  return SUPPORTED_LOCALES.has(rawLocale) ? rawLocale : "ru";
}
