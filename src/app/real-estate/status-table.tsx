import clsx from "clsx";
import React from "react";

interface IThisProps {
  status: "AVAILABLE" | "SOLD" | "BOOKED" | "UNAVAILABLE";
}

function StatusTable({ status }: IThisProps) {
  function PrintStatus() {
    if (status === "AVAILABLE") {
      return "Свободно";
    }

    if (status === "BOOKED") {
      return "Забронировано";
    }

    if (status === "UNAVAILABLE") {
      return "Недоступно";
    }

    if (status === "SOLD") {
      return "Продано";
    }
  }

  return (
    <div className="flex-js-c gap-2">
      <div
        className={clsx("w-4 h-4 min-w-4 rounded-[2px]", {
          "!bg-[#ce2432]": status === "SOLD",
          "bg-green-600": status === "AVAILABLE",
          "bg-[#f69f13]": status === "BOOKED",
          "bg-[#a7a7a7]": status === "UNAVAILABLE",
        })}
      ></div>
      {PrintStatus()}
    </div>
  );
}

export default StatusTable;
