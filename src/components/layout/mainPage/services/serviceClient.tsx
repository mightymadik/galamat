"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ServiceItemData } from "@/types/mainPage";

interface ServicesClientProps {
  serviceData: ServiceItemData[];
}

export default function ServicesClient({ serviceData }: ServicesClientProps) {
  const t = useTranslations();

  if (!serviceData || serviceData.length === 0) return null;

  return (
    <div className="py-[40px]">
      <div className="wrapper flex flex-col gap-[32px]">
        <h1 className="text-[36px] not-italic font-medium leading-[49.93px]">
          {serviceData[0].ourServiceTitle}
        </h1>
        <div className="flex gap-[4px] lg:gap-[32px] self-stretch rounded-[16px] 
                        overflow-x-auto lg:overflow-x-visible 
                        flex-nowrap lg:flex-row [scrollbar-width:none]">
          {serviceData.map((service) => (
            <div key={service.id} className="w-[343px] lg:flex-1 lg:w-auto flex-shrink-0 px-[20px] pt-[20px] h-[277px] rounded-[16px] bg-[#F4F6FB] relative transition-all duration-300 hover:bg-[#1A3C7E] group">
              <h1 className="text-black not-italic font-medium z-10 leading-[100%] group-hover:text-white transition-colors duration-300 text-[32px]">{service.serviceTitle}</h1>
              {service.image && (
                <Image
                  src={service.image}
                  alt={service.serviceTitle}
                  width={230}
                  height={200}
                  className="max-h-[200px] object-contain h-full w-full absolute bottom-0 right-0 rounded-b-[16px]"
                  unoptimized
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
