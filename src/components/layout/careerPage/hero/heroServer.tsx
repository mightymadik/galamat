import { getCareerHero } from "@/features/careerPage/getCareerPage";
import { CareerHeroData } from "@/types/careerPage";

export default async function CareerHeroServer(): Promise<CareerHeroData | null> {
  try {
    const data = await getCareerHero();
    return data;
  } catch (error) {
    console.error("Failed to fetch HR hero", error);
    return null;
  }
}
