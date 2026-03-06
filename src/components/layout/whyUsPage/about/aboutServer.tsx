import { getWhyUsAbout } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsAboutItemData } from "@/types/whyUsPage";

export default async function AboutServer(): Promise<WhyUsAboutItemData[] | null>  {
    try {
        const data = await getWhyUsAbout();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}