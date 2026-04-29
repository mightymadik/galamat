import { getCareerTeam } from "@/features/careerPage/getCareerPage";
import { CareerTeamData } from "@/types/careerPage";

export default async function TeamServer(): Promise<CareerTeamData[]> {
  try {
    return await getCareerTeam();
  } catch (error) {
    console.error("Failed to fetch HR team", error);
    return [];
  }
}
