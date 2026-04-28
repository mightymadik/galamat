"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

export default function WhyUsTeam() {
  const slides = useMemo(
    () => [
      { id: 1, image: "/img/why-us-team-1.jpg", alt: "Команда Galamat 1" },
      { id: 2, image: "/img/why-us-team-2.jpg", alt: "Команда Galamat 2" },
      { id: 3, image: "/img/why-us-team-3.jpg", alt: "Команда Galamat 3" },
    ],
    []
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);
  const prevIndex = (activeIndex - 1 + slides.length) % slides.length;
  const nextIndex = (activeIndex + 1) % slides.length;

  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (index: number) => {
    if (index === activeIndex) return;
    const forwardDistance = (index - activeIndex + slides.length) % slides.length;
    const backwardDistance = (activeIndex - index + slides.length) % slides.length;
    setDirection(forwardDistance <= backwardDistance ? 1 : -1);
    setActiveIndex(index);
  };
  const SWIPE_THRESHOLD = 40;

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
    if (typeof endX !== "number") {
      touchStartX.current = null;
      return;
    }

    const deltaX = endX - touchStartX.current;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    touchStartX.current = null;
  };

  return (
    <section className="bg-[#132C5E] relative isolate">
      <img
        src="/img/why-us-team-bg.png"
        alt="Why us team background"
        className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
      />
      <div className="wrapper relative z-10">
        <div className="flex flex-col items-center justify-center py-20 max-lg:py-15 gap-6">
          <div className="self-stretch justify-center text-white text-4xl font-medium font-['Gotham'] leading-10">
            Наша команда
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
                    <Image src={slide.image} alt={slide.alt} fill className="object-cover object-[50%_20%]" />
                  </div>
                );
              })}

              <button
                type="button"
                aria-label="Предыдущий слайд"
                onClick={goPrev}
                className="absolute left-15 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-[#1A3C7E] text-white flex items-center justify-center max-lg:hidden"
              >
                <img src="/img/arrow-left.svg" alt="Arrow left" width={10} height={10} />
              </button>

              <button
                type="button"
                aria-label="Следующий слайд"
                onClick={goNext}
                className="absolute right-15 top-1/2 -translate-y-1/2 z-20 size-12 rounded-full bg-[#1A3C7E] text-white flex items-center justify-center max-lg:hidden"
              >
                <img src="/img/arrow-right.svg" alt="Arrow right" width={10} height={10} />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Перейти к слайду ${index + 1}`}
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