"use client"
import "./whyUsInfra.scss";
import { WhyUsInfraItemData } from "@/types/whyUsPage";

export default function WhyUsInfra({ infraData }: { infraData: WhyUsInfraItemData[] }) {

    if (!infraData || infraData.length === 0) return null;

    return (
        <div className="py-[40px]">
            <div className="wrapper flex flex-col justify-center items-center gap-[32px]">
                <h1 className="text-[#122C5E] text-center [font-size:_clamp(24px,5vw,64px)] not-italic font-medium leading-[100%] lg:leading-[64px] self-stretch">
                    {infraData[0].infraTitle}
                </h1>
                <div className="flex w-full gap-[32px] self-stretch flex-wrap">
                    <div className="flex flex-col lg:flex-row gap-[32px] w-full">
                        <div
                            style={{ backgroundImage: `url(${infraData[0].infraItemImage[0]})` }}
                            className="flex w-full lg:w-2/3 h-[400px] sm:h-[480px] lg:h-[640px] p-[32px] items-start rounded-[32px]
    bg-[url(/img/intime.jpg)] bg-cover bg-center bg-no-repeat">
                            <h1 className="text-[#FFF] text-[28px] sm:text-[36px] lg:text-[48px] font-medium leading-[1.1] drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                                {infraData[0].infraItemTitle}
                            </h1>
                        </div>
                        <div className="flex flex-col w-full lg:w-1/3 h-[400px] sm:h-[480px] lg:h-[640px] rounded-[32px] bg-[#F4F6FB] overflow-hidden">
                            <h1
                                className="text-[#1F1F1F] text-[28px] sm:text-[36px] lg:text-[48px] font-medium leading-[1.1] p-[32px] z-10"
                                style={{ textShadow: "0 1.2px 1.2px rgba(244, 246, 251, 1)" }}
                            >
                                {infraData[1].infraItemTitle}
                            </h1>

                            <div
                                style={{ backgroundImage: `url(${infraData[1].infraItemImage[0]})` }}
                                className="w-full h-full flex-1 -mt-16 bg-contain bg-center bg-no-repeat"></div>
                        </div>

                    </div>

                    <div className="flex flex-wrap gap-[32px] w-full">
                        {/* Левая колонка */}
                        <div className="standart flex flex-col w-full md:w-[416px] h-[864px] rounded-[32px] bg-[#F4F6FB] overflow-hidden">
                            <h1 className="text-[#1F1F1F] text-[32px] md:text-[48px] font-medium leading-[1.1] p-[24px] md:p-[32px] z-10"
                                style={{ textShadow: "0 1.2px 1.2px rgba(244, 246, 251, 1)" }}
                            >
                                {infraData[2].infraItemTitle}
                            </h1>
                            <div
                                style={{ backgroundImage: `url(${infraData[2].infraItemImage[0]})` }}
                                className="w-full h-full flex-1 -mt-16 bg-contain bg-center bg-no-repeat"></div>
                        </div>

                        {/* Правая колонка */}
                        <div className="flex flex-col gap-[32px] flex-1 w-full min-w-[300px]">
                            {/* Верхний ряд */}
                            <div
                                style={{ backgroundImage: `url(${infraData[3].infraItemImage[0]})` }}
                                className="flex w-full h-[416px] p-[24px] md:p-[32px] flex-col justify-end items-start rounded-[32px] bg-cover bg-center bg-no-repeat">
                                <h1 className="max-w-[430px] text-[#FFF] text-[32px] md:text-[48px] font-medium leading-[1.1]">
                                    {infraData[3].infraItemTitle}
                                </h1>
                            </div>

                            {/* Нижний ряд */}
                            <div className="flex flex-wrap gap-[32px] w-full">
                                <div 
                                style={{ backgroundImage: `url(${infraData[4].infraItemImage[0]})` }}
                                className="flex flex-1 min-w-[300px] h-[300px] md:h-[416px] p-[24px] md:p-[32px] items-end rounded-[32px] bg-cover bg-center bg-no-repeat">
                                    <h1 className="text-[#FFF] text-[32px] md:text-[48px] font-medium leading-[1.1]">
                                        {infraData[4].infraItemTitle}
                                    </h1>
                                </div>
                                <div className="flex flex-col justify-evenly flex-1 w-full min-w-[300px] h-[300px] md:h-[416px] p-[24px] md:p-[32px] items-start rounded-[32px] bg-[#F4F6FB] overflow-hidden">
                                    <h1 className="text-black text-[32px] md:text-[48px] font-medium leading-[1.1]">
                                        {infraData[5].infraItemTitle}
                                    </h1>
                                    <div 
                                    style={{ backgroundImage: `url(${infraData[5].infraItemImage[0]})` }}
                                    className="w-full aspect-square bg-cover bg-center bg-no-repeat rounded-b-[32px] -rotate-[15deg]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}