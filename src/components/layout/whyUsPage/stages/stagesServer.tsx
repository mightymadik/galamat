import { getWhyUsHrStages } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHrStageData } from "@/types/whyUsPage";

export default async function StagesServer(): Promise<WhyUsHrStageData[]> {
  try {
    return await getWhyUsHrStages();
  } catch (error) {
    console.error("Failed to fetch HR stages", error);
    return [];
  }
}
