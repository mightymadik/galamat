import { getWhyUsBuilds } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsBuildsItemData } from "@/types/whyUsPage";

export default async function BuildServer(): Promise<WhyUsBuildsItemData[] | null>  {
    try {
        const data = await getWhyUsBuilds();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}