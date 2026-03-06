"use client"
import { WhyUsAboutItemData } from "@/types/whyUsPage";

export default function WhyUsAbout({ aboutData }: { aboutData: WhyUsAboutItemData[] }) {

    if (!aboutData || aboutData.length === 0) {
        console.log("No about data to display");
    }
    
    const firstItem = aboutData[0];
    
    return (
        <div className="flex flex-col py-[40px]">
            <div className="wrapper flex flex-col lg:flex-row justify-center items-start gap-[32px]">
                <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
                    <h1 className="text-[#8B8DA5] [font-size:_clamp(24px,5vw,36px)] not-italic font-medium leading-[100%]">{firstItem.whyUsAboutTitle}</h1>
                    <h1 className="text-[#000000] [font-size:_clamp(24px,5vw,36px)] not-italic font-medium leading-[100%]">{firstItem.whyUsAboutSubtitle}</h1>
                </div>
                <p className="flex-[1_0_0] text-[#363744] text-[16px] not-italic font-normal leading-[22.4px]">
                    {firstItem.whyUsAboutDescription}
                </p>
            </div>
        </div>
    )
}