"use client";

import Image from "next/image";
import { WhyUsFactsItemData } from "@/types/whyUsPage";

export default function FactsClient({ factData }: { factData: WhyUsFactsItemData[] }) {
    if (!factData || factData.length === 0) {
        return null;
    }

    return (
        <div className="py-[40px]">
            <div className="wrapper flex items-center gap-[32px] overflow-x-auto overflow-y-hidden scrollbar-hide">
                {factData.map((item) => (
                    <div
                        key={item.id}
                        className="flex w-[304px] h-[304px] p-[32px] flex-col items-start gap-[10px] flex-shrink-0 rounded-[32px] bg-[#F4F6FB]"
                    >
                        <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
                            {item.factImage ? (
                                <Image src={item.factImage} alt={item.factTitle} width={64} height={64} />
                            ) : null}
                            <div className="flex flex-col items-start gap-[14px] self-stretch mt-4">
                                <h1 className="text-[#282D3C] text-[36px] not-italic font-medium leading-[36px] self-stretch">
                                    {item.factTitle}
                                </h1>
                                <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">
                                    {item.factSubtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}