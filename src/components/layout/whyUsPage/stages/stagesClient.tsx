"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { WhyUsHrStageData } from "@/types/whyUsPage";

export default function StagesClient({ data }: { data: WhyUsHrStageData[] }) {
  const t = useTranslations();

  return (
    <section className="relative isolate bg-[#132C5E]">
      <Image
        src="/img/why-us-team-bg.png"
        alt={t("why_us_stages_bg_alt")}
        fill
        className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
      />
      <div className="wrapper">
        <div className="flex flex-col justify-between gap-6 py-20 max-lg:py-15">
          <div className="max-w-1/2 max-lg:max-w-full self-stretch justify-center text-white text-4xl font-medium font-['Gotham'] leading-10">
            {t("why_us_stages_title")}
          </div>
          <div className="flex flex-row items-center justify-start h-[240px] overflow-x-auto overflow-y-hidden">
            {data.map((stage, index) => (
              <div key={stage.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-start justify-between rounded-[32px] bg-[#F4F6FB] p-6 w-[240px] h-[170px] shrink-0">
                  <div className="w-full flex items-start justify-between">
                    <div className="text-[#DE153B] text-4xl font-medium font-['Gotham'] leading-10">{stage.number}</div>
                    {stage.icon ? (
                      <Image src={stage.icon} alt={stage.title} width={60} height={60} />
                    ) : (
                      <div className="w-[60px] h-[60px]" />
                    )}
                  </div>
                  <div className="text-zinc-900 text-xl font-medium font-['Gotham'] leading-6 text-left">{stage.title}</div>
                </div>
                {index < data.length - 1 && (
                  <Image
                    src="/img/why-us-step-divider.svg"
                    alt=""
                    aria-hidden
                    width={48}
                    height={18}
                    className="shrink-0 -ml-3 -mr-3 z-10"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
