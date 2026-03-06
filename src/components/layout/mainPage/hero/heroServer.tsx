import { getMainPageHero } from "@/features/mainPage/getMainPage";
import { HeroItemData } from "@/types/mainPage";

export async function HeroServer(): Promise<HeroItemData[]> {
  try {
    const data = await getMainPageHero();
    return data;
  } catch (error) {
    console.error("Failed to fetch advertisement data:", error);
    throw new Error("Failed to fetch advertisement data.");
  }
}