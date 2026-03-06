import { cookies } from "next/headers";

export async function getCity() {
  const cookieStore = await cookies();
  return cookieStore.get("city")?.value || "Astana";
}