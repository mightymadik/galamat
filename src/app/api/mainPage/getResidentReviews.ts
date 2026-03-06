"use server";
import { apiGet } from "@/app/api/fetcher";
import { ResidentsReviewData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getResidentReviews(): Promise<ResidentsReviewData | null> {
  try {
    const res = await apiGet("/api/resident-reviews/?populate=*");

    const item = Array.isArray(res.data) ? res.data[0] : null;
    if (!item) return null;

    const avatar = item.residentReviewAvatar?.[0];
    const avatarUrl = avatar?.url ? `${BACKEND_URL}${avatar.url}` : null;

    const formattedDate = item.residentReviewDate
      ? new Date(item.residentReviewDate).toLocaleDateString("ru-RU")
      : null;

    return {
      id: item.id,
      residentsReviewTitle: item.residentReviewName || '',
      residentsReviewSubtitle: item.residentsReviewComplex || '',
      residentsReviewDate: formattedDate,
      residentsReviewAvatarName: item.residentReviewName || '',
      residentsReviewAvatarComplex: item.residentsReviewComplex || '',
      residentsReviewAvatarReview: item.residentReviewText || '',
      residentsReviewAvatar: avatarUrl,
      residentReviewDescription: item.residentReviewDescription || '',
    };
  } catch (error) {
    console.error("Error fetching residents review data:", error);
    return null;
  }
}