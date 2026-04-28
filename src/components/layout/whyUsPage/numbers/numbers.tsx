"use client";

import Image from "next/image";

export default function WhyUsNumbers() {
    const numbers = [
        {
            id: 1,
            icon: "/img/numbers-people.svg",
            background: "bg-[url('/img/numbers-galamat.jpg')] bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "1000+",
            subtitle: "Сотрудников в команде по всей стране",
            gridCols: "col-span-2 max-lg:min-w-[20rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 2,
            icon: "/img/numbers-calendar.svg",
            background: "bg-[#F4F6FB]",
            title: "2004",
            subtitle: "Год основания",
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#282D3C]",
        },
        {
            id: 3,
            icon: "/img/numbers-house.svg",
            background: "bg-[url('/img/numbers-houses.jpg')] bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "50+",
            subtitle: "Домов введено",
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 4,
            icon: "/img/numbers-house.svg",
            background: "bg-[url('/img/numbers-competitor.jpg')] bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "Конкурентные условия труда",
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
        {
            id: 5,
            icon: "/img/numbers-calendar.svg",
            background: "bg-[#F4F6FB]",
            title: "20+",
            subtitle: "Лет на рынке",
            gridCols: "col-span-1 max-lg:min-w-[10rem] max-lg:shrink-0",
            textColor: "text-[#282D3C]",
        },
        {
            id: 6,
            icon: "/img/numbers-buildings.svg",
            background: "bg-[url('/img/numbers-office.jpg')] bg-cover bg-center bg-no-repeat",
            gradient: "bg-gradient-to-b from-gray-800/0 to-gray-800/80",
            title: "Современный офис",
            gridCols: "col-span-2 max-lg:min-w-[20rem] max-lg:shrink-0",
            textColor: "text-[#FFF]",
        },
    ]
  return (
    <section>
      <div className="wrapper">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
            <div className="self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">Мы в цифрах</div>
            <div className="w-full min-w-0 flex max-lg:flex-nowrap max-lg:gap-6 max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:pb-2 max-lg:[-webkit-overflow-scrolling:touch] lg:grid lg:grid-cols-4 lg:auto-rows-[370px] lg:overflow-visible gap-6">
                {numbers.map((number) => (
                    <div key={number.id} className={`${number.gridCols} rounded-[32px] overflow-hidden max-lg:w-80 max-lg:h-56`}>
                        <div className="flex flex-col justify-between relative p-6 h-full w-full">
                            <div className={`${number.background} w-full h-full absolute top-0 left-0`}></div>
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