import { getWhyUsHrTeam } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHrTeamData } from "@/types/whyUsPage";

export default async function TeamServer(): Promise<WhyUsHrTeamData[]> {
  try {
    return await getWhyUsHrTeam();
  } catch (error) {
    console.error("Failed to fetch HR team", error);
    return [];
  }
}
