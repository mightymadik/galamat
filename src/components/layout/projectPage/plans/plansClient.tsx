"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ProjectPlansDataItem } from "@/types/projectPage";
import { ZoomImage } from "./zoomImage";

type UIPlan = {
  id: number;
  rooms: number;
  img: string;
  area: string;
};

export default function PlansClient({ plansData }: { plansData: ProjectPlansDataItem[] }) {
  if (!plansData || plansData.length === 0) {
    return null;
  }

  const t = useTranslations();

  const [activeRooms, setActiveRooms] = useState<number>(1);
  const [activePlan, setActivePlan] = useState<UIPlan | null>(null);

  const plans: UIPlan[] = useMemo(
    () => plansData.map(plan => ({
      id: plan.id,
      rooms: plan.complexPlansRoom,
      img: plan.complexPlansImage,
      area: plan.complexPlansArea.toString()
    })),
    [plansData]
  );

  const availableRooms = useMemo(() => {
    return Array.from(
      new Set(plans.map(plan => plan.rooms))
    ).sort((a, b) => a - b);
  }, [plans]);

  const filteredPlans = useMemo(
    () => plans.filter(plan => plan.rooms === activeRooms),
    [plans, activeRooms]
  );

  useEffect(() => { setActivePlan(filteredPlans[0] ?? null); }, [filteredPlans]);

  return (
    <div className="py-[40px] lg:py-[64px] bg-[#F4F6FB]">
      <div className="wrapper flex flex-col items-start gap-[10px]">
        <div className="flex flex-col items-start gap-[32px] w-full">
          <h1 className="text-[#202028] text-[36px] font-medium leading-[41.76px]">
            {t("plan_title")}
          </h1>

          <div className="flex items-center gap-[32px] self-stretch flex-col-reverse lg:flex-row">
            <div className="flex w-full lg:max-w-[416px] min-h-[487px] px-[16px] py-[16px] lg:px-[32px] lg:py-[24px] flex-col justify-start items-start gap-[16px] rounded-[36px] bg-white">
              <div className="flex flex-col items-start gap-[4px] self-stretch w-full">
                <p className="text-[#132C5E] text-[12px] font-normal">
                  {t("plan_rooms")}
                </p>

                <div className="flex items-start gap-[8px] self-stretch w-full">
                  {availableRooms.map((num) => (
                    <Button
                      key={num}
                      onClick={() => setActiveRooms(num)}
                      className={`flex w-full h-[44px] rounded-[12px] font-medium transition-colors ${activeRooms === num
                        ? "bg-[#1A3C7E] text-white"
                        : "bg-[#F4F5F9] text-black hover:bg-[#e5e6ea]"
                        }`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <span className="text-[16px] font-normal">
                {filteredPlans.length} {t("plan_apartments")}
              </span>

              <div className="flex flex-col items-start gap-[16px] self-stretch overflow-y-auto max-h-[300px]">
                <div className="flex flex-col gap-[8px] self-stretch">
                  {Array.from({
                    length: Math.ceil(filteredPlans.length / 3),
                  }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex gap-[8px] justify-center"
                    >
                      {filteredPlans
                        .slice(rowIndex * 3, rowIndex * 3 + 3)
                        .map((plan) => {
                          const isActive = activePlan?.id === plan.id;

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setActivePlan(plan)}
                              className={`flex h-[139px] p-[12px] w-full flex-col justify-between items-center rounded-[8px] cursor-pointer transition-colors ${isActive
                                ? "bg-[#F4F6FB]"
                                : "bg-white hover:bg-[#F8F9FB]"
                                }`}
                            >
                              <Image
                                src={plan.img}
                                alt="plan"
                                width={88}
                                height={80}
                                className="h-[78px] w-auto"
                              />
                              <span className="text-[#282D3C] text-[16px] font-medium">
                                {plan.area} м<sup>2</sup>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex w-full p-[28px] flex-col justify-center items-center gap-[12px] rounded-[36px] bg-white">
              {activePlan ? (
                <>
                  <div className="flex justify-between items-center self-stretch">
                    <p className="text-[#8C94A8] text-[16px] font-normal opacity-0">
                      {activePlan.id}
                    </p>
                    {/* <p className="text-[#8C94A8] text-[16px] font-normal">
                      {activePlan.code}
                    </p> */}
                  </div>

                  <div className="w-full max-w-[454px]">
                    <ZoomImage
                      src={activePlan.img}
                      width={454}
                      height={406}
                      zoom={2.2}
                      radius={32}
                    />
                  </div>
                </>
              ) : (
                <p className="text-[#8C94A8] text-[16px]">
                  {t("select_plan")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// "use client"

// import { useState, useEffect, useMemo } from "react";
// import { Button } from "@heroui/button"
// import Image from "next/image"

// export default function Plans() {
//     const [activeRooms, setActiveRooms] = useState(1);
//     const [activePlan, setActivePlan] = useState<any>(null);

//     const plans = [
//         { id: 1, rooms: 1, img: "/img/plan.png", size: "41", project: "GalaOne", section: "10", entrance: "8", floor: "3/12", price: "21 162 813", code: "1-41-А-1(1.1)" },
//         { id: 2, rooms: 2, img: "/img/plan.png", size: "51", project: "GalaOne", section: "12", entrance: "4", floor: "5/12", price: "25 780 000", code: "2-51-Л-П(5.5)" },
//         { id: 3, rooms: 3, img: "/img/plan.png", size: "83", project: "GalaTwo", section: "3", entrance: "2", floor: "8/12", price: "33 540 000", code: "3-83-К-Л(8.3)" },
//         { id: 4, rooms: 1, img: "/img/plan.png", size: "41", project: "GalaOne", section: "10", entrance: "8", floor: "3/12", price: "21 162 813", code: "1-41-А-1(1.2)" },
//         { id: 5, rooms: 2, img: "/img/plan.png", size: "51", project: "GalaOne", section: "12", entrance: "4", floor: "5/12", price: "25 780 000", code: "2-51-Л-П(5.6)" },
//         { id: 6, rooms: 3, img: "/img/plan.png", size: "83", project: "GalaTwo", section: "3", entrance: "2", floor: "8/12", price: "33 540 000", code: "3-83-К-Л(8.4)" },
//         { id: 7, rooms: 1, img: "/img/plan.png", size: "41", project: "GalaOne", section: "10", entrance: "8", floor: "3/12", price: "21 162 813", code: "1-41-А-1(1.3)" },
//         { id: 8, rooms: 2, img: "/img/plan.png", size: "51", project: "GalaOne", section: "12", entrance: "4", floor: "5/12", price: "25 780 000", code: "2-51-Л-П(5.7)" },
//         { id: 9, rooms: 3, img: "/img/plan.png", size: "83", project: "GalaTwo", section: "3", entrance: "2", floor: "8/12", price: "33 540 000", code: "3-83-К-Л(8.5)" },
//     ];

//     // фильтруем планы по выбранной комнатности
//     const filteredPlans = useMemo(
//         () => plans.filter((plan) => plan.rooms === activeRooms),
//         [activeRooms]
//     );

//     // при смене комнатности — активен первый план этой категории
//     useEffect(() => {
//         if (filteredPlans.length > 0) {
//             setActivePlan(filteredPlans[0]);
//         }
//     }, [filteredPlans]);

//     return (
//         <div className="py-[40px] lg:py-[64px] bg-[#F4F6FB]">
//             <div className="wrapper flex flex-col items-start gap-[10px]">
//                 <div className="flex flex-col items-start gap-[32px] w-full">
//                     <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[41.76px]">Выберите квартиру</h1>
//                     <div className="flex items-center gap-[32px] self-stretch flex-col-reverse lg:flex-row">
//                         <div className="flex w-full lg:max-w-[416px] min-h-[487px] lg:min-h-[589px] px-[16px] py-[16px] lg:px-[32px] lg:py-[24px] flex-col justify-center items-start gap-[16px] rounded-[36px] bg-white">
//                             <div className="flex flex-col items-start gap-[4px] self-stretch w-full">
//                                 <p className="overflow-hidden text-[#132C5E] overflow-ellipsis [font-size:_clamp(11px,1vw,12px)] not-italic font-normal leading-[normal]">Комнатность</p>
//                                 <div className="flex items-start gap-[7.606px] self-stretch w-full">
//                                     {[1, 2, 3, 4].map((num) => (
//                                         <Button
//                                             key={num}
//                                             onClick={() => setActiveRooms(num)}
//                                             className={`flex min-w-[72px] w-full font-medium h-[44px] flex-1 justify-center items-center rounded-[12px] transition-colors duration-200 ${activeRooms === num
//                                                 ? "bg-[#1A3C7E] text-white"
//                                                 : "bg-[#F4F5F9] text-black hover:bg-[#e5e6ea]"
//                                                 }`}
//                                         >
//                                             {num}
//                                         </Button>
//                                     ))}
//                                 </div>
//                             </div>
//                             <span className="text-[16px] not-italic font-normal leading-[normal]">{filteredPlans.length} квартир</span>
//                             <div className="flex flex-col items-end gap-[16px] self-stretch">
//                                 <div className="flex flex-col items-start gap-[16px] self-stretch">
//                                     <div className="flex flex-col items-start gap-[16px] self-stretch overflow-y-auto max-h-[290px]">
//                                         <div className="flex flex-col gap-[8px] self-stretch min-h-[300px]">
//                                             {Array.from({ length: Math.ceil(filteredPlans.length / 3) }).map(
//                                                 (_, rowIndex) => (
//                                                     <div
//                                                         key={rowIndex}
//                                                         className="flex items-center gap-[8px] self-stretch justify-center"
//                                                     >
//                                                         {filteredPlans
//                                                             .slice(rowIndex * 3, rowIndex * 3 + 3)
//                                                             .map((plan) => {
//                                                                 const isActive = activePlan?.id === plan.id;
//                                                                 return (
//                                                                     <div
//                                                                         key={plan.id}
//                                                                         onClick={() => setActivePlan(plan)}
//                                                                         className={`flex h-[139px] p-[12px] w-full flex-col justify-between items-center rounded-[8px] cursor-pointer transition-colors duration-200 ${isActive
//                                                                                 ? "bg-[#F4F6FB]"
//                                                                                 : "bg-white hover:bg-[#F8F9FB]"
//                                                                             }`}
//                                                                     >
//                                                                         <Image
//                                                                             src={plan.img}
//                                                                             alt="plan"
//                                                                             className="h-[78.63px] w-auto mx-auto"
//                                                                             width={88}
//                                                                             height={80}
//                                                                         />
//                                                                         <span className="text-[#282D3C] text-center text-[16px] font-medium tracking-[-0.9px]">
//                                                                             {plan.size} м<sup>2</sup>
//                                                                         </span>
//                                                                     </div>
//                                                                 );
//                                                             })}
//                                                     </div>
//                                                 ))}
//                                         </div>

//                                     </div>
//                                 </div>
//                                 <Button className="flex h-[44px] min-w-[44px] min-h-[44px] p-[13px] justify-center items-center self-stretch rounded-[12px] bg-[#1A3C7E] text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
//                                     Посмотреть предложения
//                                 </Button>
//                             </div>
//                         </div>
//                         <div className="flex w-full h-full p-[28px] flex-col justify-center items-center gap-[12px] flex-[1_0_0] rounded-[36px] bg-[#FFF]">
//                             {activePlan ? (
//                                 <>
//                                     <div className="flex justify-between items-center self-stretch">
//                                         <p className="text-[#8C94A8] text-[16px] font-normal">
//                                             {activePlan.id}/{plans.length}
//                                         </p>
//                                         <p className="text-[#8C94A8] text-[16px] font-normal">
//                                             {activePlan.code}
//                                         </p>
//                                     </div>

//                                     <Image
//                                         src={activePlan.img}
//                                         alt="plan"
//                                         className="w-[454px] h-[406px] object-contain"
//                                         width={454}
//                                         height={406}
//                                     />

//                                     <div className="grid grid-cols-3 gap-[12px] lg:flex px-[24px] py-[20px] justify-between items-start rounded-[16px] bg-[#F4F6FB] w-full">
//                                         {[
//                                             { label: "Проект", value: activePlan.project },
//                                             { label: "Площадь", value: `${activePlan.size} м²` },
//                                             { label: "Секция", value: activePlan.section },
//                                             { label: "Подъезд", value: activePlan.entrance },
//                                             { label: "Этаж", value: activePlan.floor },
//                                             { label: "Стоимость", value: `от ${activePlan.price}` },
//                                         ].map((item, idx) => (
//                                             <div key={idx} className="flex flex-col justify-between items-start flex-1">
//                                                 <p className="text-[#8C94A8] [font-size:_clamp(11px,1vw,12px)] font-normal pb-[8px]">
//                                                     {item.label}
//                                                 </p>
//                                                 <span className="text-[#282D3C] [font-size:_clamp(11px,1vw,14px)] font-normal">
//                                                     {item.value}
//                                                 </span>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </>
//                             ) : (
//                                 <p className="text-[#8C94A8] text-[16px] font-normal">
//                                     Выберите планировку слева
//                                 </p>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }