"use client";

import { useTranslations } from "next-intl";

export default function QueueUnavailablePanel() {
  const t = useTranslations();
  return (
    <div className="flex w-full pl-[24px] pr-[24px] py-[32px] flex-col items-start gap-[32px] flex-[1_0_0]">
      <div className="flex flex-col pt-[24px] pr-[32px] pb-[32px] pl-[24px] items-center gap-[24px] self-stretch rounded-[24px] bg-[#FFF]">
        <div className="flex items-center gap-[16px] self-stretch">
          <span className="text-[#1A3C7E] font-[Gotham] text-[32px] not-italic font-normal leading-[32px]">
            {t("queue_offline_title")}
          </span>
        </div>
      </div>
    </div>
  );
}

