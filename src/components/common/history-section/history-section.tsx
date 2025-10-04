"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";

gsap.registerPlugin(ScrollTrigger);

function HistorySection() {
  const $t = useTranslate();

  const sectionRef = useRef(null);
  const slideRef: any = useRef(null);
  const progressRefs = useRef<HTMLDivElement[]>([]);

  const items = [
    {
      year: 2018,
      image: "2018.webp",
      title: $t("of_the_story"),
      text: $t("the_company_made_a_strategic"),
    },
    {
      year: 2019,
      image: "2019.webp",
      title: "",
      text: $t("the_residential_complex"),
    },
    {
      year: 2021,
      image: "2021.webp",
      title: "",
      text: $t("two_residential_complexes"),
    },
    {
      year: 2022,
      image: "2022.webp",
      title: "",
      text: $t("the_company_continued__"),
    },
    {
      year: 2023,
      image: "2023.webp",
      title: "",
      text: $t("the_year_was_memorable_for"),
    },
    {
      year: 2024,
      image: "2024.webp",
      title: "",
      text: $t("the_tengri_residential_complex"),
    },
    {
      year: 2025,
      image: "2025.webp",
      title: "",
      text: $t("the_company_continued_to_strengthen"),
    },
  ];
  const [visibleImage, setVisibleImage] = useState<string | null>(null);

  const [activeItem, setActiveItem] = useState<number>(0);

  useEffect(() => {
    const current = items[activeItem - 1]?.image;
    if (!current) {
      setVisibleImage(items[0].image);
      return;
    }

    setVisibleImage(null);
    const timeout = setTimeout(() => {
      setVisibleImage(current);
    }, 10);

    return () => clearTimeout(timeout);
  }, [activeItem]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top-=-20",
        end: "top top-=4500",
        pin: true,
        onUpdate(e) {
          const percent = e.progress * 100;

          if (slideRef.current && percent < 90) {
            slideRef.current.style.transform = `translateY(-${percent}%)`;
          }

          const countItems = items.length;
          const pixelRange = 4500;
          const pixelPerItem = pixelRange / countItems;

          const scrollY = e.scroll();
          const triggerStart =
            ScrollTrigger.getById("history-trigger")?.start ?? 0;
          const pixelProgress = scrollY - triggerStart;

          const currentIndex = Math.ceil(pixelProgress / pixelPerItem);

          setActiveItem(currentIndex + 1);

          items.forEach((_, i) => {
            const bar = progressRefs.current[i];
            if (!bar) {
              return;
            }

            const earlyStartOffset = pixelPerItem * 0.25;
            const fasterEndOffset = pixelPerItem * 0.15;

            const itemStart = pixelPerItem * i - earlyStartOffset;
            const itemEnd = pixelPerItem * (i + 1) - fasterEndOffset;

            if (pixelProgress >= itemEnd) {
              bar.style.height = "100%";
            } else if (pixelProgress >= itemStart && pixelProgress < itemEnd) {
              const localProgress = pixelProgress - itemStart;
              const rawPercent = (localProgress / (itemEnd - itemStart)) * 100;
              const accelerated = rawPercent * 1.35;
              const finalHeight = Math.min(accelerated, 100);

              bar.style.height = `${finalHeight.toFixed(2)}%`;
            } else {
              bar.style.height = "0%";
            }
          });
        },
        id: "history-trigger",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <div className="wrapper !pt-[20px]">
        <h3 className="text-[30px] md:text-[45px] font-medium text-[#353535] mb-3">
          {$t("story")}
        </h3>
        <p className="text-[#626262] text-[16px] md:text-[20px] w-full max-w-[981px]">
          {$t("in_the_company")}
        </p>

        <div className="w-full lg:grid grid-cols-2 gap-12 mt-10 ">
          <div className="w-full hidden lg:!block">
            <div className="w-full h-[60vh] bg-gray-100 p-6 rounded-[16px] relative overflow-hidden">
              <h4 className="text-[30px] text-white w-full max-w-[289px] font-medium leading-normal opacity-0">
                {$t("delve_into_our_history")}
              </h4>

              <img
                src={`/img/our-company/${visibleImage}`}
                alt="history background"
                className="absolute left-0 top-0 w-full h-full object-center object-cover"
              />
            </div>
          </div>

          <div className="w-full h-[60vh] overflow-hidden relative">
            <div ref={slideRef} className="w-full duration-100">
              {items.map((item, i) => (
                <div
                  key={`vert-slider-${i}`}
                  className="w-full flex-js-s items-stretch gap-4 lg:gap-10 mb-10"
                >
                  <div className="w-[100px] lg:w-[179px] lg:min-w-[179px] flex-grow flex-jc-c flex-col">
                    <div
                      className={clsx(
                        "w-[50px] h-[50px] md:w-[66px] md:h-[66px] flex-jc-c rounded-[12px] text-white text-[20px] md:text-[29.7px] mb-[29px] bg-[#A1ABBF] transition progress-circle",
                        {
                          "!bg-[#CE2432]": activeItem >= i + 1 || i === 0,
                        },
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="w-[5px] min-w-[5px] bg-[#A1ABBF] flex-grow rounded-[5px] relative overflow-hidden">
                      <div
                        className="w-full bg-[#CE2432] rounded-[5px] h-0 transition"
                        ref={(el) => {
                          if (el) {
                            progressRefs.current[i] = el;
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <h3 className="text-[30px] md:text-[45px] font-medium text-[#353535] md:mt-[-10px]">
                      {item.year}
                    </h3>
                    <h4 className="text-[16px] md:text-[20px] text-[#353535] font-medium">
                      {item.title}
                    </h4>
                    <p className="text-[16px] md:text-[20px] text-[#626262]">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bottom-gradient"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HistorySection;
