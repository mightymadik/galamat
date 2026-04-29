import { getCareerStages } from "@/features/careerPage/getCareerPage";
import { CareerStageData } from "@/types/careerPage";

export default async function StagesServer(): Promise<CareerStageData[]> {
  try {
    return await getCareerStages();
  } catch (error) {
    console.error("Failed to fetch HR stages", error);
    return [];
  }
}
