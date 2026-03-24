import React from "react";
import { useTranslations } from "next-intl";

interface FiltersFlatsActionsProps {
  totalProjects: number;
  resultNoun?: string;
  onReset?: () => void;
  onMap?: () => void;
  onSubmit?: () => void;
}

export const FiltersFlatsActions: React.FC<FiltersFlatsActionsProps> = ({
  totalProjects,
  resultNoun,
  onReset,
  onMap,
  onSubmit,
}) => {
  const t = useTranslations();
  const noun = resultNoun ?? t("objects");
  return (
    <>
      <div className="mainPageFilterResults hidden lg:flex justify-end items-end gap-3 w-full">
        <div className="mainPageFilterGroup flex justify-end items-center gap-2">
          <button
            onClick={onReset}
            className="group flex h-[44px] min-w-[44px] min-h-[44px] justify-center items-center p-[11px] gap-[8px] rounded-[12px] border-[1.5px] border-solid border-[#F3F3F3] cursor-pointer transition-all duration-300 hover:!bg-red-700 hover:text-white"
          >
            <p>{t("reset_filter")}</p>
            <svg
              className="transition-all duration-300 group-hover:[&_*]:fill-red-700 group-hover:[&_*]:stroke-white"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle cx="8" cy="8" r="6.66667" stroke="#1C274C" strokeWidth="1.5" />
              <path
                d="M9.66682 6.33351L6.3335 9.66683M6.33348 6.3335L9.6668 9.66682"
                stroke="#1C274C"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            onClick={onSubmit}
            className="flex h-[44px] min-w-[44px] min-h-[44px] p-[11px] text-white justify-center items-center rounded-[12px] bg-[#1A3C7E] cursor-pointer transition-all duration-300 hover:opacity-90 hover:text-white"
          >
            <p>{t("found")} {totalProjects} {noun}</p>
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="mobileFilterResults flex flex-col gap-3 w-full pb-[80px] lg:hidden ">
        <button
          onClick={onReset}
          className="group w-full flex h-11 justify-center items-center p-3 gap-2 rounded-[12px] border-[1.5px] border-solid border-[#F3F3F3] cursor-pointer transition-all duration-300 hover:!bg-red-700 hover:text-white"
        >
          <p>{t("reset_filter")}</p>
          <svg
            className="transition-all duration-300 group-hover:[&_*]:fill-red-700 group-hover:[&_*]:stroke-white"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="8" cy="8" r="6.66667" stroke="#1C274C" strokeWidth="1.5" />
            <path
              d="M9.66682 6.33351L6.3335 9.66683M6.33348 6.3335L9.6668 9.66682"
              stroke="#1C274C"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          onClick={onSubmit}
          className="flex w-full h-11 p-3 text-white justify-center items-center rounded-[12px] bg-[#1A3C7E] cursor-pointer transition-all duration-300 hover:opacity-90"
        >
          <p>{t("found")} {totalProjects} {noun}</p>
        </button>
      </div>
    </>
  );
};
