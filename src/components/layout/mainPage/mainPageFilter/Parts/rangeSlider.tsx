// components/common/mainPageFilter/parts/RangeSlider.tsx
"use client";
import React from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

interface RangeSliderProps {
  label: string;
  value: [number, number];
  setValue: (val: [number, number]) => void;
  min: number;
  max: number;
  step: number;
}

function formatNumber(num: number) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value,
  setValue,
  min,
  max,
  step,
}) => {
  return (
    <div className="mainPageFilterSlide flex flex-col items-start gap-[4px] w-full">
      <p className="flex self-stretch overflow-hidden text-xs not-italic font-normal">{label}</p>

      <div className="mainPageFilterSlideValues flex items-center self-stretch">
        <div className="mainPageFilterSlideValue flex items-start rounded-tl-xl rounded-bl-xl">
          <p>{formatNumber(value[0])}</p>
        </div>
        <div className="mainPageFilterSlideValue flex items-start rounded-tr-xl rounded-br-xl justify-end">
          <p>{formatNumber(value[1])}</p>
        </div>
      </div>

      <div className="mainPageFilterSlider flex flex-col items-start self-stretch">
        <Slider
          range
          min={min}
          max={max}
          step={step}
          value={value}
          className="bottom-2"
          onChange={(v) => setValue(v as [number, number])}
          trackStyle={[{ backgroundColor: "#1A3C7E", height: 2 }]}
          handleStyle={[
            {
              borderColor: "#1A3C7E",
              backgroundColor: "#1A3C7E",
              height: 18,
              width: 18,
              marginTop: -7,
              opacity: 1,
            },
            {
              borderColor: "#1A3C7E",
              backgroundColor: "#1A3C7E",
              height: 18,
              width: 18,
              marginTop: -7,
              opacity: 1,
            },
          ]}
          railStyle={{ backgroundColor: "#f4f6fb", height: 0 }}
          allowCross={false}
        />
      </div>
    </div>
  );
};
