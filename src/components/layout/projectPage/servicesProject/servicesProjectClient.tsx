"use client"

import Image from "next/image"
import { ProjectServicesDataItem } from "@/types/projectPage";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export default function ServicesProjectClient({ serviceData }: { serviceData: ProjectServicesDataItem[] }) {

    const t = useTranslations();

    const data = useMemo(
        () => serviceData.flat(),
        [serviceData]
    );

    return (
        <div className="py-[40px] lg:py-[64px]">
            <div className="wrapper flex flex-col items-start gap-[34px] self-stretch">
                <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[41.76px]">{t("happy_services")}</h1>
                <div className="flex justify-start items-center gap-[12px] lg:gap-[32px] self-stretch overflow-x-auto w-full scrollbar-hide">
                    {data.map((item, index) => (
                        <div
                            key={index}
                            className="flex min-w-[304px] w-full h-full p-[32px] flex-col items-start gap-[10px] rounded-[32px] bg-[#F4F6FB]">
                            <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
                                <Image src={item.complexServicesIcon} width={64} height={64} alt={item.complexServicesTitle} />
                                <div className="flex flex-col items-start gap-[14px] self-stretch">
                                    <h1 className="text-[#282D3C] text-[20px] not-italic font-medium leading-[36px] tracking-[-0.9px]">{item.complexServicesTitle}</h1>
                                    <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">{item.complexServicesText}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}