"use client";

import { useTranslations } from "next-intl";

interface ExpectApartmentsViewProps {
  data: any[];
}

export default function ExpectApartmentsView({ data }: ExpectApartmentsViewProps) {
  const t = useTranslations();

  if (!data || data.length === 0) return null;

  return (
    <div className="py-[40px]">
      <div className="wrapper flex flex-col gap-[32px]">
        <h1 className="text-[36px] font-medium leading-[49.93px]">{data[0].expectFlatTitle}</h1>

        <div
          className="
            flex gap-[4px] lg:gap-[32px] self-stretch rounded-[16px] 
            overflow-x-auto lg:overflow-x-visible h-[360px]
            flex-nowrap lg:flex-row scrollbar-hide"
        >
          {data.map((expectApartment: any) => (
            <div
              key={expectApartment.id}
              style={{
                backgroundImage: `linear-gradient(360deg,rgba(0,0,0,0.6),transparent),url(${expectApartment.bg})`,
              }}
              className="
                w-[343px] flex-shrink-0 lg:flex-1 flex p-[32px] 
                flex-col justify-end items-start gap-[10px] 
                rounded-[16px] bg-center bg-cover bg-no-repeat"
            >
              <h1 className="text-white text-[32px] leading-[100%]">
                {expectApartment.expectApartmentsTitle}
              </h1>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
