import { getWhyUsFacts } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsFactsItemData } from "@/types/whyUsPage";

export default async function FactsServer(): Promise<WhyUsFactsItemData[] | null>  {
    try {
        const data = await getWhyUsFacts();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}