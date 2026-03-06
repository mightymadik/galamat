import { getWhyUsInfra } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsInfraItemData } from "@/types/whyUsPage";

export default async function InfraServer(): Promise<WhyUsInfraItemData[] | null>  {
    try {
        const data = await getWhyUsInfra();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}