"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function WhyUsNumbers() {
    const t = useTranslations();

    const numbers = [
        {
            id: 1,
            icon: "/img/numbers-people.svg",
            backgroundImage: "/img/numbers-galamat.jpg",
            backgroundClassName: "bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "1000+",
            subtitle: t("why_us_numbers_card_1_subtitle"),
            gridCols: "col-span-2 max-lg:min-w-[20rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 2,
            icon: "/img/numbers-calendar.svg",
            backgroundClassName: "bg-[#F4F6FB]",
            title: "2004",
            subtitle: t("why_us_numbers_card_2_subtitle"),
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#282D3C]",
        },
        {
            id: 3,
            icon: "/img/numbers-house.svg",
            backgroundImage: "/img/numbers-houses.jpg",
            backgroundClassName: "bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "50+",
            subtitle: t("why_us_numbers_card_3_subtitle"),
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 4,
            icon: "/img/numbers-house.svg",
            backgroundImage: "/img/numbers-competitor.jpg",
            backgroundClassName: "bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: t("why_us_numbers_card_4_title"),
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 5,
            icon: "/img/numbers-calendar.svg",
            backgroundClassName: "bg-[#F4F6FB]",
            title: "20+",
            subtitle: t("why_us_numbers_card_5_subtitle"),
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#282D3C]",
        },
        {
            id: 6,
            icon: "/img/numbers-buildings.svg",
            backgroundImage: "/img/numbers-office.jpg",
            backgroundClassName: "bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: t("why_us_numbers_card_6_title"),
            gridCols: "col-span-2 max-lg:min-w-[20rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
    ]
  return (
    <section>
      <div className="wrapper">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
            <div className="self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">{t("why_us_numbers_title")}</div>
            <div className="w-full min-w-0 flex max-lg:flex-nowrap max-lg:gap-6 max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:pb-2 max-lg:[-webkit-overflow-scrolling:touch] lg:grid lg:grid-cols-4 lg:auto-rows-[370px] lg:overflow-visible gap-6">
                {numbers.map((number) => (
                    <div key={number.id} className={`${number.gridCols} rounded-[32px] overflow-hidden max-lg:w-80 max-lg:h-56`}>
                        <div className="flex flex-col justify-between relative p-6 h-full w-full">
                            {number.backgroundImage ? (
                                <Image
                                    src={number.backgroundImage}
                                    alt=""
                                    fill
                                    sizes="(max-width: 1024px) 20rem, (max-width: 1240px) 25vw, 370px"
                                    className={`w-full h-full absolute top-0 left-0 object-cover ${number.backgroundClassName}`}
                                />
                            ) : (
                                <div className={`${number.backgroundClassName} w-full h-full absolute top-0 left-0`}></div>
                            )}
                            {number.gradient && (
                                <div className={`${number.gradient} w-full h-full absolute top-0 left-0 z-[1] pointer-events-none`}></div>
                            )}
                            <Image src={number.icon} alt={number.title} width={50} height={50} className="z-10" />
                            <div className="card-text text-left w-full flex flex-col items-start gap-[14px] z-10">
                                <div className={`text-2xl font-bold max-[1240px]:text-2xl max-[1000px]:text-xl ${number.textColor}`}>{number.title}</div>
                                <div className={`text-base max-[1240px]:text-xl ${number.textColor}`}>{number.subtitle}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
}