import { getMainPageService } from "@/features/mainPage/getMainPage";
import { ServiceItemData } from "@/types/mainPage";

// Серверная функция для получения данных
export async function fetchServiceData(): Promise<ServiceItemData[] | null> {
  try {
    const data = await getMainPageService();
    return data;
  } catch (err) {
    console.error("Failed to fetch service data:", err);
    return null;
  }
}