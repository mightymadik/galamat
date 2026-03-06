"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/button";
import { ProjectHeroDataItem } from "@/types/projectPage";
import { useTranslations } from "next-intl";
import HeroSectionVideo from "./heroSectionVideo"

type Card = {
    id: number;
    bg: string;
    icon: string;
    title: string;
    text?: string;
    date?: string;
};

export default function HeroSection({
    heroData,
}: {
    heroData: ProjectHeroDataItem[];
}) {
    const data = heroData[0];
    if (!data) {
        return null;
    }

    const t = useTranslations();

    const [timers, setTimers] = useState<Record<number, string>>({});

    const [isVideoOpen, setIsVideoOpen] = useState(false);

    const badges = data?.complexHeroBadge || [];

    const cards: Card[] = [
        {
            id: 1,
            bg: "#DB1D31",
            icon: data.complexHeroPrimaryPromoIcon || "",
            title: data.complexHeroPrimaryPromoTitle || "",
            date: data.complexHeroPrimaryPromoDate,
            text: data.complexHeroPrimaryPromoSubtitle,
        },
        {
            id: 2,
            bg: "#132C5E",
            icon: data.complexHeroSecondaryPromoIcon || "",
            title: data.complexHeroSecondaryPromoTitle || "",
            text: data.complexHeroSecondaryPromoSubtitle,
        },
    ];

    // 🔥 Таймер
    useEffect(() => {
        const interval = setInterval(() => {
            const updatedTimers: Record<number, string> = {};

            cards.forEach((card) => {
                if (!card.date) return;

                const target = new Date(card.date).getTime();
                const now = Date.now();
                const diff = target - now;

                if (diff <= 0) {
                    updatedTimers[card.id] = "00 : 00 : 00 : 00";
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const minutes = Math.floor((diff / (1000 * 60)) % 60);
                    const seconds = Math.floor((diff / 1000) % 60);

                    updatedTimers[card.id] = `${days
                        .toString()
                        .padStart(2, "0")} : ${hours
                            .toString()
                            .padStart(2, "0")} : ${minutes
                                .toString()
                                .padStart(2, "0")} : ${seconds.toString().padStart(2, "0")}`;
                }
            });

            setTimers(updatedTimers);
        }, 1000);

        return () => clearInterval(interval);
    }, [cards]);

    return (
        <>
            <div className="py-[40px] flex flex-col items-center gap-[128px] flex-shrink-0">
                <div className="wrapper flex flex-col items-start gap-[24px] self-stretch">
                    <div className="flex w-full items-center gap-[12px] flex-col lg:flex-row">
                        {/* LEFT hero block */}
                        <div
                            className="flex min-h-[360px] lg:min-h-auto p-[32px] flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${data.complexHeroImage || ""})` }}
                        >
                            <div className="flex items-center gap-[4px] flex-wrap">
                                {badges.map((badge, i) => (
                                    <div
                                        key={i}
                                        className="flex px-[12px] py-[4px] justify-center items-center rounded-[16px] bg-[#F4F5F9]"
                                    >
                                        <p className="text-[#282D3C] text-[12px]">{badge}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT cards */}
                        <div className="flex flex-col items-start gap-[12px] flex-shrink-0 self-stretch flex-row lg:flex-col flex-wrap">
                            {cards.map((card) => (
                                <div
                                    key={card.id}
                                    className="w-[275px] w-full h-[258px] flex p-[16px] lg:p-[32px] flex-col items-start gap-[10px] rounded-[32px]"
                                    style={{ backgroundColor: card.bg }}
                                >
                                    <Image
                                        src={card.icon || ""}
                                        alt={card.title || ""}
                                        width={64}
                                        height={64}
                                        className="opacity-50"
                                    />

                                    <div className="flex flex-col gap-[12px] mt-auto">
                                        <h1 className="text-white text-[24px]">{card.title}</h1>

                                        <p className="text-white text-[24px]">
                                            {card.date && timers[card.id] && timers[card.id] !== "00 : 00 : 00 : 00"
                                                ? timers[card.id]
                                                : card.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BOTTOM */}
                    <div className="flex w-full items-start lg:items-center gap-[24px] flex-col lg:flex-row">
                        {/* Info */}
                        <div className="flex flex-col gap-[12px] flex-[1]">
                            <h1 className="text-[40px] font-medium">{data.complexName || ""}</h1>
                            <p className="text-[20px]">{data.complexAddress || ""}</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-[8px] lg:gap-[16px]">
                            {data.complexHeroVideo && (
                                <Button
                                    className="rounded-[64px] bg-[#DB1D31] text-white pr-4 pl-1"
                                    onPress={() => setIsVideoOpen(true)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
                                        <circle cx="18" cy="18" r="18" fill="white" />
                                        <path d="M24.3333 16.8455C25.2221 17.3587 25.2221 18.6417 24.3333 19.1549L15.3333 24.3511C14.4444 24.8643 13.3333 24.2228 13.3333 23.1964L13.3333 12.8041C13.3333 11.7777 14.4444 11.1362 15.3333 11.6494L24.3333 16.8455Z" fill="#DB1D31" />
                                    </svg>
                                    {t("watch_video")}
                                </Button>
                            )}
                            {data.complexHeroBooklet && (
                                <Button
                                    className="rounded-[64px] bg-[#132C5E] text-white pr-6 pl-1"
                                    onClick={() => window.open(data.complexHeroBooklet, '_blank')}
                                >
                                    <div className="p-2 bg-white rounded-[36px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 10 12" fill="none">
                                            <path d="M5.5 0.75C5.5 0.335786 5.16421 0 4.75 0C4.33579 0 4 0.335786 4 0.75L4 5.93934L2.28033 4.21967C1.98744 3.92678 1.51256 3.92678 1.21967 4.21967C0.926777 4.51256 0.926777 4.98744 1.21967 5.28033L4.21967 8.28033C4.36032 8.42098 4.55109 8.5 4.75 8.5C4.94891 8.5 5.13968 8.42098 5.28033 8.28033L8.28033 5.28033C8.57322 4.98744 8.57322 4.51256 8.28033 4.21967C7.98744 3.92678 7.51256 3.92678 7.21967 4.21967L5.5 5.93934V0.75Z" fill="#1C274C" />
                                            <path d="M0.75 10C0.335786 10 0 10.3358 0 10.75C0 11.1642 0.335786 11.5 0.75 11.5H8.75C9.16421 11.5 9.5 11.1642 9.5 10.75C9.5 10.3358 9.16421 10 8.75 10H0.75Z" fill="#1C274C" />
                                        </svg>
                                    </div>
                                    {t("download_booklet")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <HeroSectionVideo
                video={data.complexHeroVideo}
                isOpen={isVideoOpen}
                onClose={() => setIsVideoOpen(false)}
            />
        </>
    );
}