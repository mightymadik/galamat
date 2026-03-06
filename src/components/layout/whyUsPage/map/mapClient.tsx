"use client";

import { WhyUsOfficeItemData } from "@/types/whyUsPage";
import { useState, useEffect } from "react";

export default function WhyUsMap({ officeData }: { officeData: WhyUsOfficeItemData }) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (!officeData.officeImages.length || officeData.officeImages.length === 1)
            return;

        const interval = setInterval(() => {
            setActiveIndex((prev) =>
                prev === officeData.officeImages.length - 1 ? 0 : prev + 1
            );
        }, 10000);

        return () => clearInterval(interval);
    }, [officeData.officeImages.length]);

    return (
        <div className="pb-[40px]">
            <div className="wrapper flex flex-col items-center gap-[32px]">
                <h1 className="text-[#122C5E] text-center [font-size:_clamp(24px,5vw,64px)] not-italic font-medium leading-[100%] lg:leading-[64px]">
                    {officeData.officeTitle}
                </h1>

                <div className="flex flex-col lg:flex-row items-start gap-[32px] self-stretch">
                    {/* Slider */}
                    <div className="h-[602px] w-full lg:max-w-[908px] rounded-[32px] bg-[#F4F6FB] overflow-hidden relative">
                        <div
                            className="flex transition-transform duration-700 ease-in-out h-full"
                            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                        >
                            {officeData.officeImages.map((src, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 w-full h-full bg-cover bg-center rounded-[32px]"
                                    style={{ backgroundImage: `url(${src})` }}
                                />
                            ))}
                        </div>

                        {/* Indicators */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                            {officeData.officeImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveIndex(index)}
                                    className="cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="71" height="5" viewBox="0 0 71 5" fill="none">
                                        <path
                                            opacity={index === activeIndex ? 1 : 0.4}
                                            d="M2.34375 2.34416H68.2848"
                                            stroke="white"
                                            strokeWidth="4.68832"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="w-full h-[602px] rounded-[32px] bg-[#F4F6FB] overflow-hidden">
                        <iframe
                            className="rounded-[32px] w-full h-full"
                            src={officeData.officeMap}
                            frameBorder="0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}