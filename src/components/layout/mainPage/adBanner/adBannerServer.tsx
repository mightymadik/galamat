// adBannerServer.ts
import { getMainPageAdvertisements } from "@/features/mainPage/getMainPage";
import { AdvertisementData } from "@/types/mainPage";

// Серверная функция для получения рекламных данных
export async function fetchAdData(): Promise<AdvertisementData | null> {
  try {
    const data = await getMainPageAdvertisements();
    return data;
  } catch (error) {
    console.error("Failed to fetch advertisement data:", error);
    return null;
  }
}