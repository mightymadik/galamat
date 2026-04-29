"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { CareerNumberData } from "@/types/careerPage";

export default function NumbersClient({ data }: { data: CareerNumberData[] }) {
  const t = useTranslations();

  return (
    <section>
      <div className="wrapper">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
          <div className="self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">
            {t("why_us_numbers_title")}
          </div>
          <div className="w-full min-w-0 flex flex-col gap-6 lg:grid lg:grid-cols-4 lg:auto-rows-[370px] lg:overflow-visible">
            {data.map((number, index) => {
              const isWide = index % 5 === 0;
              const hasBackgroundImage = Boolean(number.bgImage);
              const textColor = hasBackgroundImage ? "text-[#FFF]" : "text-[#282D3C]";

              return (
                <div
                  key={number.id}
                  className={`${isWide ? "col-span-2" : "col-span-1"} rounded-[32px] overflow-hidden w-full h-56 lg:h-auto`}
                >
                  <div className="flex flex-col justify-between relative p-6 h-full w-full">
                    {hasBackgroundImage ? (
                      <>
                        <Image
                          src={number.bgImage!}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 20rem, (max-width: 1240px) 25vw, 370px"
                          className="w-full h-full absolute top-0 left-0 object-cover"
                        />
                        <div className="bg-gradient-to-b from-gray-800/0 to-gray-800/80 w-full h-full absolute top-0 left-0 z-[1] pointer-events-none" />
                      </>
                    ) : (
                      <div className="bg-[#F4F6FB] w-full h-full absolute top-0 left-0" />
                    )}
                    {number.icon ? (
                      <Image src={number.icon} alt={number.title} width={50} height={50} className="z-10" />
                    ) : (
                      <div className="z-10 w-[50px] h-[50px]" />
                    )}
                    <div className="card-text text-left w-full flex flex-col items-start gap-[14px] z-10">
                      <div className={`text-3xl font-bold max-[1240px]:text-2xl max-[1000px]:text-xl ${textColor}`}>
                        {number.title}
                      </div>
                      <div className={`text-xl max-[1240px]:text-xl ${textColor}`}>{number.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
