import { getCareerNumbers } from "@/features/careerPage/getCareerPage";
import { CareerNumberData } from "@/types/careerPage";

export default async function NumbersServer(): Promise<CareerNumberData[]> {
  try {
    return await getCareerNumbers();
  } catch (error) {
    console.error("Failed to fetch HR numbers", error);
    return [];
  }
}
