import { getWhyUsHrNumbers } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHrNumberData } from "@/types/whyUsPage";

export default async function NumbersServer(): Promise<WhyUsHrNumberData[]> {
  try {
    return await getWhyUsHrNumbers();
  } catch (error) {
    console.error("Failed to fetch HR numbers", error);
    return [];
  }
}
