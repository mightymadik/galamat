import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";

// Register GSAP plugins once (better to do this in your root layout)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

interface SlideItem {
  year: string;
  title: string;
  text: string;
  image: string;
}

function HowPlaying() {
  const $t = useTranslate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const progressRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeItem, setActiveItem] = useState<number>(1);

  // Memoize slide items to prevent unnecessary recalculations
  const items = useMemo<SlideItem[]>(
    () => [
      {
        year: "",
        title: $t("try_your_luck"),
        text: $t("play_gala_fortuna"),
        image: "slide-1.png",
      },
      {
        year: "",
        title: $t("get_bonuses"),
        text: $t("get_bonuses_win_and"),
        image: "slide-2.png",
      },
      {
        year: "",
        title: $t("buy_an_apartment_at_a_discount"),
        text: $t("take_part_and_get_bonuses_for"),
        image: "slide-3.png",
      },
    ],
    [$t],
  );

  // Safe GSAP animation with proper cleanup
  useGSAP(
    () => {
      if (!sectionRef.current || !slideRef.current) {
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top-=-20",
          end: "top top-=2500",
          pin: true,
          scrub: true,
          onUpdate: (self) => {
            const percent = self.progress * 100;
            const countItems = 100 / items.length;
            const getItem = Math.min(
              items.length - 1,
              Math.floor(percent / countItems),
            );
            const findActiveItemBlock = getItem + 1;

            setActiveItem(findActiveItemBlock);

            // Update progress bars
            const getActiveLine = progressRefs.current[getItem];
            const res = Math.abs(percent - getItem * countItems);
            const getItemPercent = Math.abs((res / countItems) * 100);

            if (getActiveLine) {
              gsap.to(getActiveLine, {
                height: `${getItemPercent}%`,
                duration: 0.1,
                overwrite: true,
              });
            }
          },
          // Better mobile handling
          invalidateOnRefresh: true,
        },
      });

      tl.to(slideRef.current, {
        yPercent: -100,
        ease: "none",
      });

      return () => {
        tl.kill();
      };
    },
    { scope: sectionRef, dependencies: [items.length] },
  );

  // Cleanup refs to prevent memory leaks
  const setProgressRef = (el: HTMLDivElement | null, index: number) => {
    progressRefs.current[index] = el;
  };

  return (
    <section ref={sectionRef} className="relative">
      <div className="wrapper !pt-[20px]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10">
          <div className="w-full hidden lg:!block">
            <div className="w-full h-[668px] bg-blue p-6 rounded-[16px] relative overflow-hidden">
              <img
                src={`/img/gala-bonus/${items[activeItem - 1]?.image || "slide-1.png"}`}
                alt="Slide content"
                className="absolute left-0 top-0 w-full h-full object-cover object-left-top"
                loading="lazy"
              />
            </div>
          </div>

          <div className="w-full h-[605px] overflow-hidden pt-10 relative">
            <div ref={slideRef} className="w-full will-change-transform">
              {items.map((item, index) => (
                <SlideItemComponent
                  key={`slide-${index}-${activeItem}`}
                  item={item}
                  index={index}
                  activeItem={activeItem}
                  setProgressRef={setProgressRef}
                />
              ))}
            </div>
            <div className="bottom-gradient absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

// Extracted Slide Item Component for better readability and performance
const SlideItemComponent = ({
  item,
  index,
  activeItem,
  setProgressRef,
}: {
  item: SlideItem;
  index: number;
  activeItem: number;
  setProgressRef: (el: HTMLDivElement | null, index: number) => void;
}) => (
  <div className="w-full flex-js-s min-h-[300px] items-stretch gap-4 lg:gap-10 mb-10">
    <div className="w-[100px] lg:w-[179px] lg:min-w-[179px] flex-grow flex-jc-c flex-col">
      <div
        className={clsx(
          "w-[50px] h-[50px] md:w-[66px] md:h-[66px] flex-jc-c rounded-[12px] text-white text-[20px] md:text-[29.7px] mb-[29px] bg-[#A1ABBF] transition-colors duration-300",
          {
            "!bg-[#CE2432]": activeItem >= index + 1 || index === 0,
          },
        )}
      >
        {index + 1}
      </div>
      <div className="w-[5px] min-w-[5px] bg-[#A1ABBF] flex-grow rounded-[5px] relative overflow-hidden">
        <div
          className="w-full bg-[#CE2432] rounded-[5px] h-0 transition-[height] duration-100"
          ref={(el) => setProgressRef(el, index)}
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
      <p className="text-[16px] md:text-[20px] text-[#626262]">{item.text}</p>

      <div className="relative block sm:hidden w-full mt-3">
        <h2 className="text-[20px] text-white font-medium absolute left-6 top-4">
          {item.title}
        </h2>
        <img
          src={`/img/gala-bonus/slide-${index + 1}-mobile.png`}
          alt="Slide content"
          className="w-[95%]"
          loading="lazy"
        />
      </div>
    </div>
  </div>
);

export default HowPlaying;
