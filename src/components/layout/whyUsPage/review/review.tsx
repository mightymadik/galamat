import ReviewClient from "./reviewClient";
import ReviewServer from "./reviewServer";

export default async function WhuUsReview() {
    const data = await ReviewServer();

    if (!data) return null;
    
    return <ReviewClient reviewData={data} />;
}