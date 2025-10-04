import Image from "next/image";
import { formatKzt } from "@/utils/helpers";
import React from "react";
import { Skeleton } from "@heroui/react";

interface IThisProps {
  _plan: IPlan;
  OpenPlanMaxView: (plan: IPlan) => void;
  areas: IProperty[] | null;
}

function PrintPlanItem({ _plan, OpenPlanMaxView, areas }: IThisProps) {
  const getFloor = areas?.find(
    (property) => property.id === +_plan.properties[0],
  );

  function PrintStatus(plan: IPlan) {
    if (areas) {
      const findArea = areas?.find((_ar) => _ar?.layoutCode === plan.code);

      if (findArea?.status === "AVAILABLE") {
        return (
          <div className="bg-blue text-white px-4 py-1 rounded-[20px] text-[14px]">
            Свободно
          </div>
        );
      }

      if (findArea?.status === "BOOKED") {
        return (
          <div className="bg-[#f69f13] text-white px-4 py-1 rounded-[20px] text-[14px]">
            Забронировано
          </div>
        );
      }

      if (findArea?.status === "UNAVAILABLE") {
        return (
          <div className="bg-[#a7a7a7] text-white px-4 py-1 rounded-[20px] text-[14px]">
            Недоступно
          </div>
        );
      }

      if (findArea?.status === "SOLD") {
        return (
          <div className="bg-[#ce2432] text-white px-4 py-1 rounded-[20px] text-[14px]">
            Продано
          </div>
        );
      } else {
        return (
          <div className="bg-[#a7a7a7] text-white px-4 py-1 rounded-[20px] text-[14px]">
            Недоступно
          </div>
        );
      }
    }
  }

  return (
    <div
      onClick={() => OpenPlanMaxView(_plan)}
      className="w-full p-2 border border-black/10 hover:shadow transition rounded-[8px] flex-js-s flex-col sm:flex-row gap-4 cursor-pointer mb-2 relative"
    >
      <div className="max-w-[180px] sm:h-[100px] w-full bg-blue/20 rounded-[8px] flex-jc-c overflow-hidden">
        <Image
          src={_plan.image.preview}
          alt="rec image"
          width={200}
          height={200}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="w-full">
        <div className="w-full mb-2 flex-jsb-c">
          <h3 className="text-[20px] font-medium">
            {formatKzt(+_plan.priceRange.min)}
          </h3>

          {getFloor ? (
            <div>{PrintStatus(_plan)}</div>
          ) : (
            <Skeleton className="w-[100px] h-[25px] rounded-[25px]" />
          )}
        </div>
        <h3 className="text-[15px] text-black/50">
          {formatKzt(+_plan.priceRange.min / +_plan.areaRange.min)} / м²
        </h3>
      </div>
      {getFloor ? (
        <h4 className="text-[13px] opacity-70 absolute right-4 bottom-4">
          {getFloor?.floor} этаж | {getFloor.area.area_total} м²
        </h4>
      ) : (
        <Skeleton className="w-[70px] h-[11px] rounded-[2px] absolute right-2 bottom-4" />
      )}
    </div>
  );
}

export default PrintPlanItem;
