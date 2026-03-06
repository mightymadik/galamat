"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdvertisementData } from "@/types/mainPage";
import "./adBanner.scss";

interface AdBannerProps {
  adData: AdvertisementData;
}

export default function AdBannerClient({ adData }: AdBannerProps) {
  const t = useTranslations();

  if (!adData) return null;

  return (
    <div className="py-[40px]">
      <div className="wrapper">
        <div
          className="flex h-[400px] p-[24px] flex-col justify-end items-center gap-[10px] rounded-[24px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${adData.image})` }}
        >
        </div>

        <div className="pt-[18px] px-[0] pb-[0] relative">
          <div className="adContainer flex mt-[auto] mx-[0] mb-[0] overflow-hidden pt-[24px] px-[0] pb-[0] relative">
            <div className="adTitles items-center flex justify-between">
              <div className="flex flex-col items-start">
                <h1 className="text-[36px] not-italic font-medium leading-[46.914px]">{adData.title}</h1>
                {adData.subtitle && (
                  <p className="text-[23px] not-italic font-bold leading-[normal] text-[#1A3C7E]">{adData.subtitle}</p>
                )}
              </div>
            </div>

            <div className="adItems flex w-full justify-end items-center gap-[32px] flex-[1_0_0]">
              {adData.badges.map((badge, index) => (
                <div key={index} className="flex items-center gap-[13.404px] max-w-[190px] shrink-0">
                  <Image src={badge.image} alt={badge.title} width={60} height={60} unoptimized/>
                  <p className="w-full text-[#122C5E] text-[16px] not-italic font-regular leading-[100%]">{badge.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
