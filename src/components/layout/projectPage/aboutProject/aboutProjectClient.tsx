"use client";

import Image from "next/image";
import { ProjectAboutDataItem } from "@/types/projectPage";
import { useTranslations } from "next-intl";

export default function AboutProject({ aboutData }: { aboutData: ProjectAboutDataItem[] }) {
    const t = useTranslations();

    if (!aboutData || !aboutData.length) return null;

    const about = aboutData[0];

    const large = about.complexAboutItemsLarge;
    const small = about.complexAboutItemsSmall;

    const rows = [];
    for (let i = 0; i < large.length; i++) {
        const bigItem = large[i];
        const smallPair = small.slice(i * 2, i * 2 + 2);

        rows.push({
            big: bigItem,
            small: smallPair,
        });
    }

    return (
        <>
            <div className="py-[40px] lg:py-[64px]">
                <div className="wrapper flex justify-center items-start gap-[32px] flex-col lg:flex-row">
                    <div className="flex flex-col items-start gap-[4px] flex-1">
                        <span className="text-[#8B8DA5] text-[36px] font-medium leading-[100%]">
                            {t("about_project_title")}
                        </span>
                        <h1 className="text-[#202028] text-[36px] font-medium leading-[100%]">
                            {about.complexAboutTitle}
                        </h1>
                    </div>

                    <p className="flex-1 text-[16px] leading-[23px]">
                        {about.complexAboutSubtitle}
                    </p>
                </div>
            </div>

            <div className="py-[40px] lg:py-[64px]">
                <div className="wrapper flex flex-col gap-[32px]">

                    {rows.map((row, index) => {
                        const isEven = index % 2 === 1;

                        return (
                            <div
                                key={index}
                                className={`flex gap-[32px] flex-col 
                                   ${isEven ? "lg:flex-row-reverse" : "lg:flex-row"}
                                `}
                            >
                                {row.big && (
                                    <div
                                        className="w-full min-h-[300px] flex flex-col justify-end rounded-[32px] bg-cover bg-center flex-1"
                                        style={{
                                            backgroundImage: `url(${row.big.complexAboutItemsLargeImage})`,
                                        }}
                                    >
                                        <div className="p-[20px] bg-[linear-gradient(0deg,rgba(37,37,56,0.8),rgba(37,37,56,0))] rounded-b-[32px]">
                                            <h1 className="text-white text-[20px] font-medium">
                                                {row.big.complexAboutItemsLargeTitle}
                                            </h1>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col lg:flex-row gap-[32px] flex-1">
                                    {row.small.map((s) => (
                                        <div
                                            key={s.id}
                                            className="justify-between flex-1 p-[32px] flex flex-col gap-[24px] rounded-[32px] bg-[#F4F6FB]"
                                        >
                                            <Image
                                                src={s.complexAboutItemsSmallImage}
                                                alt={s.complexAboutItemsSmallTitle}
                                                width={58}
                                                height={58}
                                            />
                                            <span className="text-[#363744] text-[20px] font-medium">
                                                {s.complexAboutItemsSmallTitle}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>
        </>
    );
}