/* eslint-disable react/no-unescaped-entities */
"use client";

import { Button } from "@heroui/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CareerHeroData } from "@/types/careerPage";

export default function CareerHeroClient({ data }: { data: CareerHeroData | null }) {
  const t = useTranslations();

  const titleParts = (data?.title ?? "").split("\n");

  return (
    <section>
      <div className="relative min-h-[calc(100vh-68px)]">
        <Image
          src="/img/why-us-hero-poster.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[rgba(28,34,49,0.62)]" />
        <div className="relative z-10">
          <div className="wrapper">
            <div className="flex min-h-[800px] flex-col justify-center items-center gap-6">
              <Image
                src="/img/Logo-white.svg"
                alt={t("why_us_hero_logo_alt")}
                width={192}
                height={24}
                className="w-48 h-6 object-cover object-center"
              />
              <h1 className="text-white text-4xl font-bold text-center">
                {titleParts.length > 1 ? (
                  <>
                    {titleParts[0]} <br /> {titleParts.slice(1).join(" ")}
                  </>
                ) : data?.title ? (
                  data.title
                ) : (
                  <>
                    {t("why_us_hero_title_line_1")} <br /> {t("why_us_hero_title_line_2")}
                  </>
                )}
              </h1>
              <Button
                as="a"
                href={data?.videoLink || "https://youtu.be/EfSq8N7PPXc?si=HRTGHk_abHe9tU9R"}
                target="_blank"
                rel="noopener noreferrer"
                radius="lg"
                className="w-64 h-12 min-w-12 min-h-12 px-3.5 pt-3.5 pb-4 text-base font-medium bg-[#DB1D31] text-white"
              >
                {t("why_us_hero_company_review")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
