import { getWhyUsHrConditions } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHrConditionData } from "@/types/whyUsPage";

export default async function ConditionsServer(): Promise<WhyUsHrConditionData[]> {
  try {
    return await getWhyUsHrConditions();
  } catch (error) {
    console.error("Failed to fetch HR conditions", error);
    return [];
  }
}
