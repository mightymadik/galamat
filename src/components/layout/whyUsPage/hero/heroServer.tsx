import { getWhyUsHeroes } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHeroItemData } from "@/types/whyUsPage";

export default async function HeroServer(): Promise<WhyUsHeroItemData[] | null>  {
    try {
        const data = await getWhyUsHeroes();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}