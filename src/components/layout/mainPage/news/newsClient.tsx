"use client"
import { useState } from "react";
import Link from "next/link"
import Image from "next/image";
import "./news.scss"
import { Button } from "@heroui/button";
import { NewsData } from "@/types/mainPage";
import NewsModal from "./newsModal";
import { useTranslations } from "next-intl";
import { NewsProps } from "./newsServer";

export default function NewsClient({
  socialMedia,
  newsData,
  ctaNewsData,
  residentsReviewData,
  positionNewsData
}: NewsProps) {
    const t = useTranslations();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState<NewsData | null>(null);

    const openNewsModal = (newsItem: NewsData) => {
        let contentType: ".mp4" | ".mov" | ".webm" | ".png" | ".jpg" | ".jpeg" | ".webp" = ".png";
        let videoUrl: string | undefined;
        let imageUrl: string | undefined;

        if (newsItem.newsContentExt) {
            const ext = newsItem.newsContentExt.toLowerCase();
            if (ext === '.mp4' || ext === '.mov' || ext === '.webm') {
                contentType = ext as ".mp4" | ".mov" | ".webm";
                videoUrl = newsItem.newsContent || undefined;
            } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
                contentType = ext as ".png" | ".jpg" | ".jpeg" | ".webp";
                imageUrl = newsItem.newsContent || undefined;
            }
        } else if (newsItem.newsContent) {
            const lowerContent = newsItem.newsContent.toLowerCase();
            if (lowerContent.endsWith('.mp4') || lowerContent.endsWith('.mov') || lowerContent.endsWith('.webm')) {
                if (lowerContent.endsWith('.mp4')) contentType = ".mp4";
                else if (lowerContent.endsWith('.mov')) contentType = ".mov";
                else if (lowerContent.endsWith('.webm')) contentType = ".webm";
                videoUrl = newsItem.newsContent;
            } else {
                imageUrl = newsItem.newsContent;
            }
        }

        setSelectedNews({
            ...newsItem,
            modalProps: {
                contentType,
                title: newsItem.newsTitle,
                date: newsItem.newsDate,
                imageUrl: imageUrl || (contentType.includes('.png') || contentType.includes('.jpg') || contentType.includes('.jpeg') || contentType.includes('.webp') ? newsItem.newsContent || undefined : undefined),
                videoUrl: videoUrl,
                content: newsItem.newsText || "",
                button: newsItem.newsButton
                    ? {
                        link: newsItem.newsButton.buttonLink,
                        text: newsItem.newsButton.buttonText
                    }
                    : undefined,
            }
        });
        setIsModalOpen(true);
    };

    const closeNewsModal = () => {
        setIsModalOpen(false);
        setSelectedNews(null);
    };

    if (!newsData) return null;
    if (!residentsReviewData) return null;
    if (!positionNewsData) return null;

    return (
        <div className="news py-[40px]" id="news">
            <div className="wrapper flex flex-col items-center gap-[32px]">
                <div className="newsHeader flex items-center gap-[12px] self-stretch">
                    <h1 className="text-[36px] font-medium leading-[100%]">{t("news")}</h1>
                    <div className="newsSocial flex items-start flex-[1_0_0]">
                        {socialMedia && socialMedia.map((media) => (
                            <Link target="_blank" key={media.id} href={media.socialMediaLink} className="flex w-[44px] h-[44px] min-w-[44px] min-h-[44px] justify-center items-center p-[13px]">
                                <Image src={media.socialMediaIcon} alt={media.socialMediaTitle} width={44} height={44} />
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="newsContainer flex w-full h-full flex-col items-start gap-[16px]">
                    <div className="banners flex items-start gap-[16px] w-full overflow-x-auto no-scrollbar">
                        <div className="flex max-w-[431px] flex-col items-start gap-[16px] flex-[1_0_0] h-full">
                            {newsData?.[0] && (
                                <div
                                    style={{ backgroundImage: `url(${newsData[0].newsImage})` }}
                                    className="flex w-[431px] h-[632px] p-[32px] flex-col justify-between items-start self-stretch rounded-[32px] bg-cover bg-no-repeat cursor-pointer"
                                    onClick={() => openNewsModal(newsData[0])}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="154" height="19" viewBox="0 0 154 19" fill="none">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M18.3012 0.380574H10.2804V18.1204H18.3012V0.380574Z" fill="white" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M8.16269 0.380574H0V18.1204H8.16269V0.380574ZM28.5837 0.380574H20.4209V18.1204H28.5837V0.380574Z" fill="white" />
                                        <path d="M43.2067 7.79914H52.1589V9.55443C52.1589 12.1049 51.3409 14.1782 49.705 15.7688C48.0633 17.3365 45.956 18.1203 43.36 18.1203C40.6164 18.1203 38.3329 17.2513 36.5151 15.5188C34.7428 13.7806 33.8568 11.6448 33.8568 9.09428C33.8568 6.5438 34.7428 4.40791 36.5151 2.63563C38.2875 0.880397 40.4915 0 43.1101 0C44.7517 0 46.2684 0.369191 47.6487 1.10196C49.012 1.812 50.1026 2.77205 50.8923 4.0047L47.0466 6.16326C46.6887 5.61227 46.1604 5.18052 45.4674 4.85106C44.7745 4.51024 44.0076 4.35111 43.1669 4.35111C41.7638 4.35111 40.6164 4.79424 39.7189 5.68606C38.8214 6.59492 38.367 7.74238 38.367 9.11703C38.367 10.4917 38.8101 11.605 39.6848 12.5139C40.5823 13.4454 41.8377 13.9112 43.4339 13.9112C45.5016 13.9112 46.8591 13.1501 47.5181 11.6277H43.2067V7.79914ZM65.2068 17.7511L64.4512 15.2405H58.538L57.7825 17.7511H52.8633L58.7254 0.380541H64.2468L70.1089 17.7511H65.2068ZM61.4747 5.51562L59.7025 11.4233H63.2811L61.4747 5.51562ZM76.7607 0.380541V13.4624H82.8784V17.7511H72.2277V0.380541H76.7607ZM96.6074 17.7511L95.8521 15.2405H89.9391L89.1836 17.7511H84.2644L90.1265 0.380541H95.6479L101.51 17.7511H96.6074ZM92.8759 5.51562L91.1036 11.4233H94.6822L92.8759 5.51562ZM117.029 0.380541H121.425V17.7511H117.029V8.38993L112.826 15.3654H112.382L108.201 8.41267V17.7511H103.77V0.380541H108.201L112.598 7.79914L117.029 0.380541ZM135.967 17.7511L135.2 15.2405H129.299L128.543 17.7511H123.624L129.475 0.380541H135.007L140.858 17.7511H135.967ZM132.235 5.51562L130.463 11.4233H134.041L132.235 5.51562ZM153.9 0.380541V4.66925H149.509V17.7511H144.977V4.66925H140.586V0.380541H153.9Z" fill="white" />
                                    </svg>
                                    <div className="flex h-[238px] flex-col justify-end items-start gap-[16px] flex-shrink-0 self-stretch">
                                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                                            <div className="text-white text-[16px] font-light leading-[100%]">
                                                {newsData[0].newsDate}
                                            </div>
                                            <div className="flex h-auto flex-col justify-center self-stretch text-white text-[48px] font-bold leading-[100%]">
                                                {newsData[0].newsTitle}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => openNewsModal(newsData[0])}
                                            className="flex h-[44px] max-w-[162px] min-w-[76px] px-[24px] py-[12px] justify-center items-center flex-shrink-0 self-stretch rounded-[12px] bg-[#EF0406] text-white text-center text-[14px] font-normal leading-[normal] tracking-[-0.291px]">
                                            {t("watch_video")}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {ctaNewsData && ctaNewsData.length > 0 && (
                                <div
                                    style={{ background: `url(${ctaNewsData[0].ctaImage})` }}
                                    className="flex w-[431px] min-h-[199px] p-[32px] flex-col items-start self-stretch rounded-[24px] flex-[1_0_0]"
                                >
                                    <div className="flex flex-col justify-between items-start gap-[16px] flex-[1_0_0] self-stretch">
                                        <h1 className="self-stretch text-white text-[22.8px] font-medium leading-[27.313px]">
                                            {ctaNewsData[0].ctaTitle}
                                        </h1>

                                        <div className="flex items-end gap-[24px] self-stretch">
                                            <p className="flex-[1_0_0] text-white text-[15.2px] font-normal leading-[18.645px]">
                                                {ctaNewsData[0].ctaSubtitle}
                                            </p>

                                            <Button
                                                onClick={() => window.open(ctaNewsData[0].ctaLink)}
                                                className="w-[60px] h-[60px] p-0 bg-none"
                                                style={{ background: "none" }}>
                                                <svg className="min-w-[60px] min-h-[60px]" xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none">
                                                    <rect width="60" height="60" rx="16" fill="white" />
                                                    <path d="M45.3347 30.6716C45.7057 30.3006 45.7057 29.6991 45.3347 29.3281L39.2889 23.2824C38.9179 22.9114 38.3164 22.9114 37.9454 23.2824C37.5744 23.6534 37.5744 24.2549 37.9454 24.6259L43.3194 29.9999L37.9454 35.3739C37.5744 35.7449 37.5744 36.3464 37.9454 36.7174C38.3164 37.0884 38.9179 37.0884 39.2889 36.7174L45.3347 30.6716ZM15.335 29.9999L15.335 30.9499L44.6629 30.9499L44.6629 29.9999L44.6629 29.0499L15.335 29.0499L15.335 29.9999Z" fill="#1E1E1E" />
                                                </svg>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="flex max-w-[873px] flex-col items-start gap-[16px]">
                            <div className="flex items-center gap-[16px] self-stretch w-[873px]">
                                {newsData?.[1] && (
                                    <div
                                        className="flex h-[415px] flex-col items-start flex-[1_0_0] rounded-[24px] bg-[#F4F4F6] cursor-pointer"
                                        onClick={() => openNewsModal(newsData[1])}
                                    >
                                        <div className="flex flex-col items-start gap-[12px] p-[29.134px]">
                                            <div className="flex flex-col items-start">
                                                <p className="flex w-full h-full flex-col justify-center text-[15.2px] font-light leading-[100%]">{newsData[1].newsDate}</p>
                                                <h1 className="flex w-full h-full flex-col justify-center text-[#1A3C7E] text-[48.329px] font-bold leading-[100%]">{newsData[1].newsTitle}</h1>
                                            </div>
                                            <div className="flex w-[355.334px] h-auto justify-center items-start rounded-[8px] bg-[#1A3C7E]">
                                                <div className="flex min-w-[76px] pl-[18.208px] pr-[18.208px] py-[14.112px] justify-center items-center self-stretch rounded-[8px] bg-[#FFFF]">
                                                    <p className="text-[#132C5E] text-center text-[20px] font-normal leading-[100%] tracking-[-0.291px]">{newsData[1].newsSubtitle}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ backgroundImage: `url(${newsData[1].newsImage})` }} className="w-[418px] h-[472px] rounded-[24px]"></div>
                                    </div>
                                )}
                                {newsData?.[2] && (
                                    <div
                                        style={{ backgroundImage: `url(${newsData[2].newsImage})` }}
                                        className="flex h-[415px] p-[32px] flex-col items-start flex-[1_0_0] rounded-[32px]"
                                        onClick={() => openNewsModal(newsData[2])}
                                    >
                                        <div className="flex flex-col items-start flex-[1_0_0] self-stretch justify-between">
                                            <div>
                                                <p className="text-white text-[16px] font-light leading-[100%]">{newsData[2].newsDate}</p>
                                                <h1 className="text-white flex-[1_0_0] self-stretch text-[37.509px] font-bold leading-[100%]">{newsData[2].newsTitle}</h1>
                                            </div>
                                            <div>
                                                <p className="self-stretch text-white text-[14.385px] font-normal leading-[18.645px]">
                                                    {newsData[2].newsSubtitle}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex w-[873px] h-[416px] pl-[60px] pr-[60px] py-[72.5px] justify-center items-center gap-[36px] self-stretch rounded-[24px] bg-[#F4F6FB]">
                                <div className="flex w-[334px] flex-col items-start gap-[16px]">
                                    <div className="flex px-[8px] py-[2px] justify-center items-center gap-[10px] rounded-[12px] bg-white">
                                        <p className="text-[#43495A] text-[12px] font-normal leading-[100%] tracking-[-0.255px]">Медиа</p>
                                    </div>
                                    <div className="flex flex-col justify-center items-start gap-[24px] self-stretch">
                                        <div className="flex flex-col items-start self-stretch">
                                            <h1 className="self-stretch text-[#1B1D24] text-[46px] font-bold leading-[100%] tracking-[-2.458px]">
                                                {t("residents")}
                                            </h1>
                                            <h2 className="text-[#A1A4AD] text-[46px] font-bold leading-[100%] tracking-[-2.458px]">
                                                {t("tells")}
                                            </h2>
                                        </div>
                                        <div className="flex flex-col items-start gap-[8px] self-stretch">
                                            <span className="text-[#132C5E] text-[14px] font-bold leading-[100%] tracking-[-0.291px]">
                                                {residentsReviewData?.residentReviewDescription}
                                            </span>
                                            <p className="text-[#282D3C] text-[14px] font-light leading-[100%]">
                                                {residentsReviewData?.residentsReviewDate || "12.03.2025"}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                                <div className="flex p-[24px] flex-col items-start gap-[12px] rounded-[32px] bg-white">
                                    <div className="flex items-center gap-[14px]">
                                        <Image
                                            src={residentsReviewData?.residentsReviewAvatar || "/img/folk.svg"}
                                            alt="review"
                                            width={50}
                                            height={50}
                                            className="rounded-[50px]"
                                        />
                                        <div className="">
                                            <span className="text-[#282D3C] text-[24px] font-bold leading-[100%]">
                                                {residentsReviewData?.residentsReviewAvatarName}
                                            </span>
                                            <p className="text-[#282D3C] text-[16px] font-normal leading-[100%]">
                                                {residentsReviewData?.residentsReviewAvatarComplex}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[14px] not-italic font-normal leading-[100%] w-[300px]">
                                        {residentsReviewData?.residentsReviewAvatarReview}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* <div className="positions flex items-center gap-[16px] w-full flex-col lg:flex-row">
                        {positionNewsData && positionNewsData.length > 0 ? (
                            positionNewsData.map((item, i) => (
                                <Link
                                    key={item.id || i}
                                    href={item.buttonLink || "/"}
                                    className="flex h-[150px] pl-[12px] pr-[4px] py-[12px] items-center gap-[12px] flex-shrink-0 w-full justify-between lg:justify-start lg:w-[430px] rounded-[24px] bg-[#F4F4F6]"
                                >
                                    <div className="flex max-w-[251.878px] flex-col justify-center items-start gap-[24px] flex-[1_0_0]">
                                        <span className="text-[#1B1D24] text-[16px] font-normal leading-[100%]">
                                            {item.positionTitle}
                                        </span>

                                        <Button className="flex min-w-[58.267px] px-[14.567px] py-[11.835px] justify-center items-center rounded-[7.6px] bg-[#FFF] leading-[100%]">
                                            {item.buttonText || "Подробнее"}
                                        </Button>
                                    </div>

                                    <div className="flex w-[162px] h-[142px] rounded-[20px] overflow-hidden">
                                        <div
                                            className="w-full h-full bg-cover bg-center"
                                            style={{ backgroundImage: `url(${item.positionImg})` }}
                                        />
                                    </div>
                                </Link>
                            ))
                        ) : null}
                    </div> */}
                </div>
            </div>

            {selectedNews && selectedNews.modalProps && (
                <NewsModal
                    isOpen={isModalOpen}
                    onClose={closeNewsModal}
                    contentType={selectedNews.modalProps.contentType}
                    title={selectedNews.modalProps.title}
                    date={selectedNews.modalProps.date}
                    imageUrl={selectedNews.modalProps.imageUrl}
                    videoUrl={selectedNews.modalProps.videoUrl}
                    content={selectedNews.modalProps.content}
                    button={selectedNews.modalProps.button}
                />
            )}
        </div >
    )
}