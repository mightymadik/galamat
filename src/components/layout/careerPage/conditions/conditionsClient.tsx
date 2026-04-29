"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { CareerConditionData } from "@/types/careerPage";

export default function CareerConditionsClient({ data }: { data: CareerConditionData[] }) {
  const t = useTranslations();

  return (
    <section>
      <div className="wrapper py-20 max-lg:py-15 flex flex-col gap-[60px]">
        <div className="flex max-lg:flex-col flex-row justify-between gap-6">
          <div className="max-w-1/2 max-lg:max-w-full self-stretch justify-center text-zinc-900 text-4xl font-medium font-['Gotham'] leading-10">
            {t("why_us_conditions_title")}
          </div>
          <div className="max-w-1/2 max-lg:max-w-full text-color-blue-24 text-base font-normal font-['Gotham'] leading-6 text-zinc-900">
            {t("why_us_conditions_description")}
          </div>
        </div>
        <div className="flex flex-row justify-between max-lg:justify-start gap-4 overflow-x-auto overflow-y-hidden">
          {data.map((condition) => (
            <div key={condition.id} className="flex flex-col items-left justify-between rounded-[32px] gap-6 max-lg:gap-0 bg-[#F4F6FB] p-6 min-w-[250px] max-w-[300px] shrink-0">
              {condition.icon ? (
                <Image src={condition.icon} alt={condition.title} width={40} height={40} />
              ) : (
                <div className="w-10 h-10" />
              )}
              <div className="text-zinc-900 text-xl font-medium font-['Gotham'] leading-6 text-left">{condition.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
