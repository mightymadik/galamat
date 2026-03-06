import { cookies } from "next/headers";

export async function getLocale() {
  const cookieStore = await cookies();
  return cookieStore.get("locale")?.value || "ru";
}
