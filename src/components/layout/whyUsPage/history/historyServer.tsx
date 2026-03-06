import { getWhyUsHistory } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsHistoryItemData } from "@/types/whyUsPage";

export default async function HistoryServer(): Promise<WhyUsHistoryItemData[] | null>  {
    try {
        const data = await getWhyUsHistory();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}