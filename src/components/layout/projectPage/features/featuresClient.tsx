"use client";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@heroui/button";
import { ProjectFeaturesDataItem } from "@/types/projectPage";
import { useTranslations } from "next-intl";

export default function Features({ featuresData }: { featuresData: ProjectFeaturesDataItem[] }) {
    const data = useMemo(
        () => featuresData.flat(),
        [featuresData]
    );
    const t = useTranslations();
    const categories = useMemo(() => {
        return Array.from(new Set(data.map(item => item.complexFeaturesCategory)));
    }, [data]);

    const [activeCategory, setActiveCategory] = useState<string>("");

    useEffect(() => {
        if (categories.length > 0) {
            setActiveCategory(categories[0]);
        }
    }, [categories]);
    
    const [openCardId, setOpenCardId] = useState<number | null>(null);

    const filteredCards = useMemo(() => {
        return data.filter(item => item.complexFeaturesCategory === activeCategory);
    }, [data, activeCategory]);

    return (
        <div className="py-[40px] lg:py-[64px]">
            <div className="wrapper flex flex-col items-start gap-[32px] self-stretch">

                <div className="flex flex-col lg:flex-row items-start gap-[32px] w-full">
                    <h1 className="text-[#282D3C] text-[36px] font-bold leading-[100%] flex-shrink-0">
                        {t("features")}
                    </h1>

                    <div className="w-full max-w-[665px] overflow-x-auto overflow-y-hidden scrollbar-hide">
                        <div className="flex flex-nowrap gap-[8px] p-[4px] rounded-[12px] bg-[#F4F6FB]">
                            {categories.map(category => {
                                const isActive = activeCategory === category;
                                return (
                                    <div
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`flex h-[44px] px-[13px] justify-center items-center rounded-[12px] cursor-pointer transition-colors duration-200 font-medium text-[15px] leading-[20px] whitespace-nowrap
                                            ${isActive
                                                ? "bg-[#1A3C7E] text-white"
                                                : "bg-[#F4F6FB] text-[#132C5E] hover:bg-[#E9EBF2]"
                                            }`}
                                    >
                                        {category}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex h-[400px] lg:h-[600px] justify-start items-center gap-[16px] overflow-x-auto scrollbar-hide w-full">
                    {filteredCards.map(card => {
                        const isOpen = openCardId === card.id;
                        return (
                            <div
                                key={card.id}
                                className="group flex items-end gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-no-repeat bg-cover min-w-[345px]"
                                style={{ backgroundImage: `url(${card.complexFeaturesImage})` }}
                            >
                                <div
                                    className={`group flex p-[32px] flex-col justify-end cursor-pointer transition-all duration-700 ease-in-out items-start gap-[16px] flex-[1_0_0] self-stretch rounded-[32px]
                                        ${isOpen
                                            ? "bg-[linear-gradient(0deg,_rgba(37,_37,_56,_0.80)_10%,_rgba(37,_37,_56,_0.00)_60%)]"
                                            : "bg-[linear-gradient(0deg,_rgba(37,_37,_56,_0.80)_10%,_rgba(37,_37,_56,_0.00)_60%)] hover:bg-[linear-gradient(0deg,_rgba(37,_37,_56,_0.80)_10%,_rgba(37,_37,_56,_0.00)_60%)]"
                                        }`}
                                >
                                    <div className="flex flex-row self-stretch gap-[16px] items-center">
                                        <span className="text-[#FFF] [font-size:_clamp(16px,3vw,24px)] font-medium leading-[23.2px] transition-all duration-500 group-hover:translate-y-[-10px]">
                                            {card.complexFeaturesTitle}
                                        </span>

                                        <div className="flex lg:hidden items-center gap-[10px] rounded-[12px]">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenCardId(isOpen ? null : card.id);
                                                }}
                                                className="flex w-[44px] h-[44px] justify-center items-center rounded-[12px] bg-[#F4F6FB]"
                                            >
                                                <svg
                                                    className={`w-[16px] transition-transform duration-300 ${isOpen ? "rotate-45" : "rotate-0"}`}
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <circle
                                                        cx="8"
                                                        cy="8"
                                                        r="6.7"
                                                        stroke="#1C274C"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        d="M10 8H6M8 6V10"
                                                        stroke="#1C274C"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </Button>
                                        </div>
                                    </div>

                                    <div
                                        className={`overflow-hidden transition-all duration-500 ease-in-out max-h-0 opacity-0 group-hover:max-h-[400px] group-hover:opacity-100 ${isOpen
                                            ? "max-h-[400px] opacity-100"
                                            : "max-h-0 opacity-0"
                                            }`}
                                    >
                                        <p className="text-[#FFF] [font-size:_clamp(16px,2vw,20px)] font-normal leading-[23.2px]">
                                            {card.complexFeaturesText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}