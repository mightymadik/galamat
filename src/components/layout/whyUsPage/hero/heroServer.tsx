import { getWhyUsHrHero } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHrHeroData } from "@/types/whyUsPage";

export default async function HeroServer(): Promise<WhyUsHrHeroData | null> {
  try {
    const data = await getWhyUsHrHero();
    return data;
  } catch (error) {
    console.error("Failed to fetch HR hero", error);
    return null;
  }
}