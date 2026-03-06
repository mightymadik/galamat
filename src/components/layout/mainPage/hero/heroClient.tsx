"use client";
import "tailwindcss";
import Image from "next/image";
import "./hero.scss";
import { HeroItemData } from "@/types/mainPage";

export default function MainHeroClient({ heroData }: { heroData: HeroItemData[] }) {
  return (
    <div className="hero mt-[68px] py-[40px]">
      <div className="wrapper flex [flex-flow:wrap] !w-full ml-auto mr-auto">
        {/* Desktop */}
        <div className="heroContainerGrid hidden lg:grid w-full gap-[9px] grid-cols-[repeat(3,_1fr)]">
          {heroData.map((item) => {
            const hasTwoTexts = !!item.heroSubtitle;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col items-start block no-underline min-h-[432px] rounded-[32px] h-[675px] px-[40px] py-[24px] overflow-hidden
                  ${hasTwoTexts ? "justify-between" : "justify-end"}
                  ${!item.bg ? "bg-gray-200" : ""}`}
              >
                {item.bg && (
                  <Image
                    src={item.bg}
                    alt=""
                    fill
                    className="object-fill object-top"
                    sizes="(max-width: 1023px) 90vw, 33vw"
                  />
                )}
                <div className="relative z-10 flex flex-col justify-between items-start w-full h-full self-stretch">
                  <h1 className="self-stretch text-3xl font-bold text-white leading-tight">
                    {item.heroTitle}
                  </h1>
                  {item.heroSubtitle && (
                    <h1 className="[font-size:_clamp(1rem,13vw,235px)] leading-[100%] text-white font-bold">
                      {item.heroSubtitle}
                    </h1>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="heroScroll flex lg:hidden gap-[9px] w-full">
          {heroData.map((item) => {
            const hasTwoTexts = !!item.heroSubtitle;
            return (
              <div
                key={item.id}
                className={`heroItem relative flex-shrink-0 w-[90vw] h-[512px] rounded-[32px] px-[24px] py-[20px] overflow-hidden flex flex-col
                  ${hasTwoTexts ? "justify-between" : "justify-end"}
                  ${!item.bg ? "bg-gray-200" : ""}`}
              >
                {item.bg && (
                  <Image
                    src={item.bg}
                    alt=""
                    fill
                    className="object-fill object-top"
                    sizes="90vw"
                  />
                )}
                <div className="relative z-10 flex flex-col justify-between w-full h-full">
                  <h1 className="text-3xl font-bold text-white leading-tight">
                    {item.heroTitle}
                  </h1>
                  {item.heroSubtitle && (
                    <h1 className="[font-size:_clamp(1rem,13vw,235px)] leading-[100%] text-white font-bold">
                      {item.heroSubtitle}
                    </h1>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}