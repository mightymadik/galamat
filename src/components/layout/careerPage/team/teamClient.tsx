"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CareerTeamData } from "@/types/careerPage";

export default function TeamClient({ data }: { data: CareerTeamData[] }) {
  const t = useTranslations();

  const slides = useMemo(
    () =>
      data
        .filter((item) => item.image)
        .map((item, index) => ({
          id: item.id,
          image: item.image!,
          alt: t("why_us_team_go_to_slide_aria", { slide: index + 1 }),
          title: item.title,
        })),
    [data, t]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (!slides.length) return null;

  const prevIndex = (activeIndex - 1 + slides.length) % slides.length;
  const nextIndex = (activeIndex + 1) % slides.length;

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % slides.length);

  const goToSlide = (index: number) => {
    if (index !== activeIndex) setActiveIndex(index);
  };

  const getSlidePosition = (index: number) => {
    if (index === activeIndex) return "active";
    if (index === prevIndex) return "prev";
    if (index === nextIndex) return "next";
    return "hidden";
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (typeof endX === "number" && Math.abs(endX - touchStartX.current) >= 40) {
      endX > touchStartX.current ? goPrev() : goNext();
    }
    touchStartX.current = null;
  };

  return (
    <section className="bg-[#132C5E] relative isolate">
      <Image
        src="/img/why-us-team-bg.png"
        alt={t("why_us_team_bg_alt")}
        fill
        className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
      />
      <div className="wrapper relative z-10">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
          <div className="self-stretch justify-center text-white text-4xl font-medium font-['Gotham'] leading-10">
            {t("why_us_team_title")}
          </div>

          <div className="relative w-full px-5 max-lg:px-0">
            <div className="relative h-[560px] max-lg:h-[430px]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {slides.map((slide, index) => {
                const position = getSlidePosition(index);
                const positionClasses =
                  position === "active"
                    ? "left-1/2 -translate-x-1/2 scale-100 max-lg:scale-[0.94] opacity-100 z-20"
                    : position === "prev"
                      ? "left-[35%] -translate-x-1/2 scale-[0.82] max-lg:scale-[0.7] opacity-55 z-10"
                      : position === "next"
                        ? "left-[65%] -translate-x-1/2 scale-[0.82] max-lg:scale-[0.7] opacity-55 z-10"
                        : "opacity-0 scale-75 z-0 pointer-events-none";

                return (
                  <div
                    key={slide.id}
                    className={`absolute top-1/2 w-[80%] max-lg:w-[72%] h-full -translate-y-1/2 rounded-[28px] overflow-hidden shadow-[0_18px_42px_rgba(0,0,0,0.35)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${positionClasses}`}
                  >
                    <Image src={slide.image} alt={slide.alt} fill className="object-cover object-[50%_0]" />
                  </div>
                );
              })}

              <button
                type="button"
                aria-label={t("why_us_team_prev_slide_aria")}
                onClick={goPrev}
                className="absolute left-15 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-[#1A3C7E] text-white flex items-center justify-center max-lg:hidden"
              >
                <Image src="/img/arrow-left.svg" alt="Arrow left" width={10} height={10} />
              </button>

              <button
                type="button"
                aria-label={t("why_us_team_next_slide_aria")}
                onClick={goNext}
                className="absolute right-15 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-[#1A3C7E] text-white flex items-center justify-center max-lg:hidden"
              >
                <Image src="/img/arrow-right.svg" alt="Arrow right" width={10} height={10} />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={t("why_us_team_go_to_slide_aria", { slide: index + 1 })}
                  onClick={() => goToSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    activeIndex === index ? "w-10 bg-white" : "w-6 bg-white/45 hover:bg-white/65"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
