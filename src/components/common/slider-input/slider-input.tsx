import { Slider } from "@heroui/react";
import clsx from "clsx";
import { useState } from "react";

interface IThisProps {
  className?: string;
  labelName: string;
  min: number;
  max: number;
  step: number;
  typeOption?: string;
  onChangeInput?: (val: number[]) => void;
}

function SliderInput({
  className,
  labelName,
  min,
  max,
  step,
  typeOption,
  onChangeInput,
}: IThisProps) {
  const [value, setValue] = useState<number[]>([min, max]);

  function PrintNumber(number: number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  return (
    <div className={clsx("filter-group", className)}>
      <div className="label">{labelName}</div>
      <div className="values">
        от <span id="price-min-val">{PrintNumber(value[0])}</span> {typeOption}{" "}
        — до <span id="price-max-val">{PrintNumber(value[1])}</span>{" "}
        {typeOption}
      </div>
      <div className="relative">
        <Slider
          className="relative"
          classNames={{
            base: "gap-3 mt-[-6px]",
            filler: "bg-[#8299C7] h-[1px]",
            track: "h-[1px]",
          }}
          defaultValue={[min, max]}
          maxValue={max}
          minValue={min}
          onChange={(value) => {
            setValue(typeof value === "object" ? value : [min, max]);
            if (onChangeInput) {
              onChangeInput(typeof value === "object" ? value : [min, max]);
            }
          }}
          step={step}
          renderThumb={({ index, ...props }) => (
            <div
              {...props}
              className="bg-transparent cursor-grab mt-[-6px] h-[1px] bg-[#132C5E] rounded-[3px]"
            >
              <span
                className={clsx(
                  "transition-transform h-[13px] w-[13px] bg-[#132C5E] rounded-[3px] block group-data-[dragging=true]:scale-80",
                  index === 0
                    ? "h-[13px] w-[13px] bg-[#132C5E] rounded-[3px]" // first thumb
                    : "h-[13px] w-[13px] bg-[#132C5E] rounded-[3px]", // second thumb
                )}
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default SliderInput;
