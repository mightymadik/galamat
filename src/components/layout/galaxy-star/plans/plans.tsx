"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/button";
import Image from "next/image";
import { useSelector } from "react-redux";

export default function Plans() {
  const selectedLang = useSelector(
    (state: any) => state.translateSite.selectedLang,
  );

  // Russian texts
  const russianTexts = {
    title: "Выберите квартиру",
    roomCount: "Комнатность",
    apartments: "квартир",
    viewOffers: "Посмотреть предложения",
    selectLayout: "Выберите планировку слева",
  };

  // Kazakh texts
  const kazakhTexts = {
    title: "Пәтерді таңдаңыз",
    roomCount: "Бөлмелер саны",
    apartments: "пәтер",
    viewOffers: "Ұсыныстарды қарау",
    selectLayout: "Сол жақтан жоспар таңдаңыз",
  };

  // Function to get texts based on language with if-else logic
  const getTexts = () => {
    if (selectedLang === "kz") {
      return kazakhTexts;
    } else {
      return russianTexts;
    }
  };

  const texts = getTexts();

  const [activeRooms, setActiveRooms] = useState(1);
  const [activePlan, setActivePlan] = useState<any>(null);

  const plans = [
    { id: 1, rooms: 1, img: "/img/1.svg", size: "34.3" },
    { id: 2, rooms: 1, img: "/img/2.svg", size: "39.0" },
    { id: 3, rooms: 1, img: "/img/3.svg", size: "39.2" },
    { id: 4, rooms: 1, img: "/img/4.svg", size: "36.1" },
    { id: 5, rooms: 1, img: "/img/5.svg", size: "41.2" },
    { id: 6, rooms: 1, img: "/img/6.svg", size: "43.4" },
    { id: 7, rooms: 1, img: "/img/7.svg", size: "42,2" },
    { id: 8, rooms: 1, img: "/img/8.svg", size: "42.9" },
    { id: 9, rooms: 2, img: "/img/9.svg", size: "57.4" },
    { id: 10, rooms: 2, img: "/img/10.svg", size: "60.2" },
    { id: 11, rooms: 2, img: "/img/11.svg", size: "61.3" },
    { id: 12, rooms: 2, img: "/img/12.svg", size: "58.3" },
    { id: 13, rooms: 3, img: "/img/13.svg", size: "78.2" },
    { id: 14, rooms: 3, img: "/img/14.svg", size: "80.4" },
    { id: 15, rooms: 3, img: "/img/15.svg", size: "76.5" },
    { id: 16, rooms: 3, img: "/img/16.svg", size: "81.4" },
    { id: 17, rooms: 3, img: "/img/17.svg", size: "83.3" },
  ];

  // фильтруем планы по выбранной комнатности
  const filteredPlans = useMemo(
    () => plans.filter((plan) => plan.rooms === activeRooms),
    [activeRooms],
  );

  // при смене комнатности — активен первый план этой категории
  useEffect(() => {
    if (filteredPlans.length > 0) {
      setActivePlan(filteredPlans[0]);
    }
  }, [filteredPlans]);

  return (
    <div className="py-[40px] lg:py-[64px] bg-[#F4F6FB]">
      <div className="wrapper flex flex-col items-start gap-[10px]">
        <div className="flex flex-col items-start gap-[32px] w-full">
          <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[41.76px]">
            {texts.title}
          </h1>
          <div className="flex items-center gap-[32px] self-stretch flex-col-reverse lg:flex-row">
            <div className="flex w-full lg:max-w-[416px] min-h-[487px] lg:min-h-[589px] px-[16px] py-[16px] lg:px-[32px] lg:py-[24px] flex-col justify-center items-start gap-[16px] rounded-[36px] bg-white">
              <div className="flex flex-col items-start gap-[4px] self-stretch w-full">
                <p className="overflow-hidden text-[#132C5E] overflow-ellipsis [font-size:_clamp(11px,1vw,12px)] not-italic font-normal leading-[normal]">
                  {texts.roomCount}
                </p>
                <div className="flex items-start gap-[7.606px] self-stretch w-full">
                  {[1, 2, 3].map((num) => (
                    <Button
                      key={num}
                      onClick={() => setActiveRooms(num)}
                      className={`flex min-w-[72px] w-full font-medium h-[44px] flex-1 justify-center items-center rounded-[12px] transition-colors duration-200 ${
                        activeRooms === num
                          ? "bg-[#1A3C7E] text-white"
                          : "bg-[#F4F5F9] text-black hover:bg-[#e5e6ea]"
                      }`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
              <span className="text-[16px] not-italic font-normal leading-[normal]">
                {filteredPlans.length} {texts.apartments}
              </span>
              <div className="flex flex-col items-end gap-[16px] self-stretch">
                <div className="flex flex-col items-start gap-[16px] self-stretch">
                  <div className="flex flex-col items-start gap-[16px] self-stretch overflow-y-auto max-h-[290px]">
                    <div className="flex flex-col gap-[8px] self-stretch min-h-[300px]">
                      {Array.from({
                        length: Math.ceil(filteredPlans.length / 3),
                      }).map((_, rowIndex) => (
                        <div
                          key={rowIndex}
                          className="flex items-center gap-[8px] self-stretch justify-center"
                        >
                          {filteredPlans
                            .slice(rowIndex * 3, rowIndex * 3 + 3)
                            .map((plan) => {
                              const isActive = activePlan?.id === plan.id;
                              return (
                                <div
                                  key={plan.id}
                                  onClick={() => setActivePlan(plan)}
                                  className={`flex h-[139px] p-[12px] w-full flex-col justify-between items-center rounded-[8px] cursor-pointer transition-colors duration-200 ${
                                    isActive
                                      ? "bg-[#F4F6FB]"
                                      : "bg-white hover:bg-[#F8F9FB]"
                                  }`}
                                >
                                  <Image
                                    src={plan.img}
                                    alt="plan"
                                    className="h-[78.63px] w-auto mx-auto"
                                    width={88}
                                    height={80}
                                  />
                                  <span className="text-[#282D3C] text-center text-[16px] font-medium tracking-[-0.9px]">
                                    {plan.size} м<sup>2</sup>
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full h-full p-[28px] flex-col justify-center items-center gap-[12px] flex-[1_0_0] rounded-[36px] bg-[#FFF]">
              {activePlan ? (
                <>
                  <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#8C94A8] text-[16px] font-normal">
                      {activePlan.id}/{plans.length}
                    </p>
                    <p className="text-[#8C94A8] text-[16px] font-normal">
                      {activePlan.code}
                    </p>
                  </div>

                  <Image
                    src={activePlan.img}
                    alt="plan"
                    className="w-[454px] h-[406px] object-contain"
                    width={454}
                    height={406}
                  />

                  <div className="grid grid-cols-3 gap-[12px] lg:flex px-[24px] py-[20px] justify-between items-start rounded-[16px] bg-[#F4F6FB] w-full opacity-0">
                    {[
                      { label: "Проект", value: activePlan.project },
                      { label: "Площадь", value: `${activePlan.size} м²` },
                      { label: "Секция", value: activePlan.section },
                      { label: "Подъезд", value: activePlan.entrance },
                      { label: "Этаж", value: activePlan.floor },
                      { label: "Стоимость", value: `от ${activePlan.price}` },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between items-start flex-1"
                      >
                        <p className="text-[#8C94A8] [font-size:_clamp(11px,1vw,12px)] font-normal pb-[8px]">
                          {item.label}
                        </p>
                        <span className="text-[#282D3C] [font-size:_clamp(11px,1vw,14px)] font-normal">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[#8C94A8] text-[16px] font-normal">
                  {texts.selectLayout}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
