"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { WhyUsBuildsItemData } from "@/types/whyUsPage";

export default function BuildClient({ buildData }: { buildData: WhyUsBuildsItemData[] }) {
  if (!buildData || buildData.length === 0) return null;

  const data = buildData[0];
  const images = data.buildsImage || [];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="py-[40px]">
      <div className="wrapper flex flex-col items-center gap-[32px]">
        <h1 className="text-[#EF0406] text-center [font-size:_clamp(24px,5vw,64px)] not-italic font-medium leading-[100%] lg:leading-[64px]">
          {data.buildsTitle}
        </h1>

        {/* Slider */}
        <div className="relative h-[600px] w-full overflow-hidden rounded-[32px] bg-[#F4F6FB]">
          {data.buildsImage.map((src: string, index: number) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={src}
                alt={`Slide ${index + 1}`}
                fill
                className="object-cover rounded-[32px]"
                priority={index === 0}
                unoptimized
              />
            </div>
          ))}

          {/* Индикаторы */}
          <div className="absolute bottom-[32px] left-0 right-0 flex justify-center gap-[12px]">
            {data.buildsImage.map((_: string, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-[5px] w-[80px] rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}