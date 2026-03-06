"use client"
import { WhyUsReviewsItemData, WhyUsReviewItem } from "@/types/whyUsPage";
import { useRef } from "react";
import Image from "next/image";

export default function WhyUsReview({ reviewData }: { reviewData: WhyUsReviewsItemData }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: React.MouseEvent) => {
        isDown = true;
        if (!scrollRef.current) return;
        scrollRef.current.classList.add("grabbing");
        startX = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft = scrollRef.current.scrollLeft;
    };

    const onMouseLeave = () => {
        isDown = false;
        scrollRef.current?.classList.remove("grabbing");
    };

    const onMouseUp = () => {
        isDown = false;
        scrollRef.current?.classList.remove("grabbing");
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1; // скорость
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const items = reviewData?.reviews || [];
    const midpoint = Math.ceil(items.length / 2);
    const firstRow = items.slice(0, midpoint);
    const secondRow = items.slice(midpoint);

    return (
        <div className="py-[40px]">
            <div className="wrapper flex items-center flex-col gap-[32px]">
                <h1 className="text-[#122C5E] text-center [font-size:_clamp(24px,5vw,64px)] not-italic font-medium leading-[100%] lg:leading-[64px]">
                    {reviewData.reviewTitle}
                </h1>
            </div>
            <div 
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className="relative max-w-[1320px] mx-auto py-[40px] bg-white overflow-x-scroll overflow-y-hidden scrollbar-hide cursor-grab select-none"
                style={{
                    WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0), black 10%, black 90%, rgba(0,0,0,0))',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%'
                }}
            >
                <div className="flex items-start h-[442px] w-full flex flex-col gap-[32px]"
                >
                    <div className="flex flex-row gap-[10px] w-max justify-start">
                        {firstRow.map((review: WhyUsReviewItem) => (
                            <div
                                key={review.id}
                                className="flex w-[528.998px] h-[204.999px] p-[32px] flex-col justify-center items-start gap-[10px] flex-shrink-0 snap-start rounded-[32px] bg-[#F4F6FB]"
                            >
                                <div className="flex items-center gap-[16px] flex-[1_0_0] self-stretch">

                                    <Image
                                        src={review.reviewItemImage ?? "/img/User Heart.svg"}
                                        width={140}
                                        height={140}
                                        alt={review.reviewItemName}
                                    />

                                    <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
                                        <p className="text-[#000] text-[14px] font-normal leading-[14px]">
                                            {review.reviewItemSource}
                                        </p>

                                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                                            <h1 className="text-[#000] text-[24px] font-medium leading-[32px]">
                                                {review.reviewItemName}
                                            </h1>

                                            <span className="text-[#000] text-[14px] font-normal leading-[14px]">
                                                {review.reviewItemText}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-[2.741px]">
                                            {[...Array(review.reviewItemStars)].map((_, index) => (
                                                <svg
                                                    key={index}
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="17"
                                                    height="16"
                                                    viewBox="0 0 17 16"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M7.73281 0.306351C8.00383 -0.102117 8.60362 -0.102117 8.87464 0.306351L11.3702 4.06766C11.4613 4.20488 11.5987 4.30471 11.7573 4.34889L16.1057 5.56003C16.5779 5.69156 16.7633 6.262 16.4586 6.64597L13.6525 10.1817C13.5502 10.3107 13.4977 10.4723 13.5047 10.6368L13.6965 15.1466C13.7174 15.6364 13.2321 15.9889 12.7728 15.8178L8.54295 14.2417C8.38865 14.1842 8.2188 14.1842 8.0645 14.2417L3.83467 15.8178C3.37533 15.9889 2.89009 15.6364 2.91092 15.1466L3.10279 10.6368C3.10979 10.4723 3.0573 10.3107 2.95494 10.1817L0.148897 6.64597C-0.155832 6.262 0.029514 5.69156 0.501739 5.56003L4.85014 4.34889C5.00877 4.30471 5.14618 4.20488 5.23722 4.06766L7.73281 0.306351Z"
                                                        fill="#EF0406"
                                                    />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-row gap-[10px] w-full self-stretch justify-start -translate-x-[40px]">
                        {secondRow.map((review: WhyUsReviewItem) => (
                            <div key={review.id} className="flex w-[528.998px] h-[204.999px] p-[32px] flex-col justify-center items-start gap-[10px] flex-shrink-0 snap-start rounded-[32px] bg-[#F4F6FB]">
                                <div className="flex items-center gap-[16px] flex-[1_0_0] self-stretch">
                                    <Image
                                        src={review.reviewItemImage ?? "/img/User Heart.svg"}
                                        width={140}
                                        height={140}
                                        alt={review.reviewItemName}
                                    />
                                    <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
                                        <p className="text-[#000] text-[14px] font-normal leading-[14px]">
                                            {review.reviewItemSource}
                                        </p>

                                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                                            <h1 className="text-[#000] text-[24px] font-medium leading-[32px]">
                                                {review.reviewItemName}
                                            </h1>

                                            <span className="text-[#000] text-[14px] font-normal leading-[14px]">
                                                {review.reviewItemText}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-[2.741px]">
                                            {[...Array(review.reviewItemStars)].map((_, index) => (
                                                <svg
                                                    key={index}
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="17"
                                                    height="16"
                                                    viewBox="0 0 17 16"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M7.73281 0.306351C8.00383 -0.102117 8.60362 -0.102117 8.87464 0.306351L11.3702 4.06766C11.4613 4.20488 11.5987 4.30471 11.7573 4.34889L16.1057 5.56003C16.5779 5.69156 16.7633 6.262 16.4586 6.64597L13.6525 10.1817C13.5502 10.3107 13.4977 10.4723 13.5047 10.6368L13.6965 15.1466C13.7174 15.6364 13.2321 15.9889 12.7728 15.8178L8.54295 14.2417C8.38865 14.1842 8.2188 14.1842 8.0645 14.2417L3.83467 15.8178C3.37533 15.9889 2.89009 15.6364 2.91092 15.1466L3.10279 10.6368C3.10979 10.4723 3.0573 10.3107 2.95494 10.1817L0.148897 6.64597C-0.155832 6.262 0.029514 5.69156 0.501739 5.56003L4.85014 4.34889C5.00877 4.30471 5.14618 4.20488 5.23722 4.06766L7.73281 0.306351Z"
                                                        fill="#EF0406"
                                                    />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}