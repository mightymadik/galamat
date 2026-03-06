import { getMainPageSocialMedia, getMainPageNews, getMainPageCtaNews, getMainPageResidentsReview, getMainPagePositionNews } from "@/features/mainPage/getMainPage";
import NewsClient from "./newsClient";
import { SocialMediaData, NewsData, CtaNewsData, ResidentsReviewData, PositionNewsData } from "@/types/mainPage";

export interface NewsProps {
  socialMedia: SocialMediaData[] | null;
  newsData: NewsData[] | null;
  ctaNewsData: CtaNewsData[] | null;
  residentsReviewData: ResidentsReviewData | null;
  positionNewsData: PositionNewsData[] | null;
}

export default async function NewsServer() {
  try {
    const socialMedia = await getMainPageSocialMedia();
    const newsData = await getMainPageNews();
    const ctaNewsData = await getMainPageCtaNews();
    const residentsReviewData = await getMainPageResidentsReview();
    const positionNewsData = await getMainPagePositionNews();

    return (
      <NewsClient
        socialMedia={socialMedia}
        newsData={newsData}
        ctaNewsData={ctaNewsData}
        residentsReviewData={residentsReviewData}
        positionNewsData={positionNewsData}
      />
    );
  } catch (error) {
    return (
      <NewsClient
        socialMedia={null}
        newsData={null}
        ctaNewsData={null}
        residentsReviewData={null}
        positionNewsData={null}
      />
    );
  }
}