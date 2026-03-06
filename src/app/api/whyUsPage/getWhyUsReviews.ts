"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsReviewsItemData, WhyUsReviewItem } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getReviews(): Promise<WhyUsReviewsItemData | null> {
  try {
    const res = await apiGet(
      "/api/whyus-reviews/?populate[reviewItem][populate]=reviewItemImage"
    );

    if (!res?.data?.length) return null;

    const rootItem = res.data[0];

    const items = rootItem.reviewItem || [];

    const mappedReviews: WhyUsReviewItem[] = items.map((item: any) => {
      const images = item.reviewItemImage ? (Array.isArray(item.reviewItemImage) ? item.reviewItemImage : [item.reviewItemImage]) : [];
      const imageUrls = images
        .map((img: any) => {
          const url = img?.formats?.large?.url || img?.formats?.medium?.url || img?.formats?.small?.url || img?.url || null;
          return url ? `${BACKEND_URL}${url}` : null;
        })
        .filter(Boolean);

      return {
        id: item.id,
        reviewItemName: item.reviewItemName,
        reviewItemText: item.reviewItemText,
        reviewItemSource: item.reviewItemSource,
        reviewItemStars: item.reviewItemStars,
        reviewItemImage: imageUrls[0] || null
      };
    });

    return {
      reviewTitle: rootItem.reviewsTitle || "",
      reviews: mappedReviews
    };
  } catch (error) {
    console.error("Error fetching reviews data:", error);
    return null;
  }
}

export { getReviews as getWhyUsReviews };