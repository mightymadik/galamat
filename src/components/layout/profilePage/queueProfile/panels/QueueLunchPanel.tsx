"use client";

import ElapsedTimer from "./ElapsedTimer";
import { useTranslations } from "next-intl";

export default function QueueLunchPanel() {
  const t = useTranslations();
  return (
    <div className="flex w-full pl-[24px] pr-[24px] py-[32px] flex-col items-start gap-[32px] flex-[1_0_0]">
      <div className="flex flex-col pt-[24px] pr-[32px] pb-[32px] pl-[24px] items-center gap-[24px] self-stretch rounded-[24px] bg-[#FFF]">
        <div className="flex items-center gap-[16px] self-stretch">
          <span className="text-[#1A3C7E] font-[Gotham] text-[32px] not-italic font-normal leading-[32px]">
            У вас обед
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-[16px] self-stretch">
          <div className="flex p-[12px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[12px] bg-[#F3F5F8]">
            <div className="flex items-center gap-[8px] self-stretch">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <g opacity="0.8">
                  <path d="M10 7.5V10.8333L12.0833 12.9167" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2.91602 3.75033L6.24937 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17.0833 3.75033L13.75 1.66699" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.25 4.33637C7.35315 3.69824 8.63392 3.33301 10 3.33301C14.1421 3.33301 17.5 6.69087 17.5 10.833C17.5 14.9751 14.1421 18.333 10 18.333C5.85786 18.333 2.5 14.9751 2.5 10.833C2.5 9.46693 2.86523 8.18616 3.50337 7.08301" stroke="#1A3C7E" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              </svg>
              <p className="text-[#282D3C] text-[12px] not-italic font-medium leading-[16px] opacity-80">{t("queue_break_time")}</p>
            </div>
            <ElapsedTimer className="text-[#000] text-[34px] not-italic font-bold leading-[normal] self-stretch" />
          </div>
        </div>
      </div>
    </div>
  );
}

