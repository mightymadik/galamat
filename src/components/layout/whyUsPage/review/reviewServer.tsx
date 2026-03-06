import { getWhyUsReviews } from "@/features/whyUsPage/getWhyUsPage";
import { WhyUsReviewsItemData } from "@/types/whyUsPage";

export default async function ReviewServer(): Promise<WhyUsReviewsItemData | null>  {
    try {
        const data = await getWhyUsReviews();
        return data;
    } catch (error) {
        console.error("Не получилось загурзить данные", error);
        return null;
    }
}