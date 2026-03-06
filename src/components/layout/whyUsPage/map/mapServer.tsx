import { getWhyUsOffice } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsOfficeItemData } from "@/types/whyUsPage";

export default async function OfficeServer(): Promise<WhyUsOfficeItemData | null>  {
    try {
        const data = await getWhyUsOffice();
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}