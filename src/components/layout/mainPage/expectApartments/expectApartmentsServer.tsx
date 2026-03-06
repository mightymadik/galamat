import { getMainPageExpectApartments } from "@/features/mainPage/getMainPage";

export async function fetchExpectApartments() {
  try {
    const data = await getMainPageExpectApartments();
    return data;
  } catch (err) {
    console.error("Failed to fetch expect apartments:", err);
    throw new Error("Service Unavailable");
  }
}