import { getCareerConditions } from "@/features/careerPage/getCareerPage";
import { CareerConditionData } from "@/types/careerPage";

export default async function CareerConditionsServer(): Promise<CareerConditionData[]> {
  try {
    return await getCareerConditions();
  } catch (error) {
    console.error("Failed to fetch career conditions", error);
    return [];
  }
}
