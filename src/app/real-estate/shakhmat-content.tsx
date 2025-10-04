import { useSelector } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { ActionGetProperty } from "@/app/actions/start-crone/get-property";
import BoxItemChess from "@/app/real-estate/box-item-chess";
import { Spinner } from "@heroui/react";

function ShakhmatContent() {
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [boards, setBoards] = useState<IBoard | null>(null);
  const [property, setProperty] = useState<
    { id: number; property_id: number; data: IProperty }[] | null
  >(null);

  useEffect(() => {
    if (filterParams.houseId) {
      ActionGetProjectsProperty("/board", {
        houseId: filterParams.houseId,
      }).then((result) => {
        setBoards(result);
      });

      ActionGetProperty().then((data) => {
        if (data.status === "ok") {
          setProperty(data.data as any);
        }
      });
    }
  }, [filterParams]);

  const groupedBySection: {
    [key: string]: { floor: number; cells: ICell[] }[];
  } = {};

  if (boards) {
    boards.floors.forEach((floor) => {
      floor.sections.forEach((section) => {
        if (!groupedBySection[section.name]) {
          groupedBySection[section.name] = [];
        }
        groupedBySection[section.name].push({
          floor: floor.number,
          cells: section.cells,
        });
      });
    });
  }

  const findScrollBlock = useRef<HTMLDivElement>(null);

  function nextScroll() {
    if (findScrollBlock && findScrollBlock.current) {
      findScrollBlock.current.scrollLeft += 400;
    }
  }

  function prevScroll() {
    if (findScrollBlock && findScrollBlock.current) {
      findScrollBlock.current.scrollLeft -= 400;
    }
  }

  return (
    <div>
      {filterParams.houseId ? (
        <div className="w-full">
          {property ? (
            <div className="checkerboard-wrap">
              <div className="top-info !mb-6 flex gap-2 sm:gap-6 flex-wrap">
                <div className="top-info-item flex items-center gap-2">
                  <span className="circle w-3 h-3 rounded-full bg-blue"></span>
                  <span className="text-sm">Свободно</span>
                </div>
                <div className="top-info-item flex items-center gap-2">
                  <span className="circle w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm">Продано</span>
                </div>
                <div className="top-info-item flex items-center gap-2">
                  <span className="circle w-3 h-3 rounded-full bg-yellow-400"></span>
                  <span className="text-sm">Бронь</span>
                </div>
                <div className="top-info-item flex items-center gap-2">
                  <span className="circle w-3 h-3 rounded-full bg-gray-400"></span>
                  <span className="text-sm">Не для продажи</span>
                </div>
              </div>

              {boards ? (
                <div className="relative">
                  <div
                    ref={findScrollBlock}
                    className="flex overflow-x-auto gap-4 select-none pb-4 bottom-scroll-hidden"
                  >
                    {Object.entries(groupedBySection).map(
                      ([sectionName, sectionFloors], idx) => (
                        <div key={`section-${idx}`}>
                          <div className="sect-table w-full">
                            <div className="w-full">
                              {sectionFloors
                                .sort((a, b) => b.floor - a.floor)
                                .map((floorItem, i) => (
                                  <div
                                    key={`floor-${i}`}
                                    className="flex items-center gap-4 mb-1"
                                  >
                                    <div className="w-[30px] text-sm font-semibold text-gray-600 text-right">
                                      {floorItem.floor}.
                                    </div>
                                    <div className="flex gap-1 sm:gap-3">
                                      {floorItem.cells.map((cell, ci) => (
                                        <BoxItemChess
                                          key={`cell-${ci}`}
                                          property={
                                            property?.find(
                                              (_pr) =>
                                                _pr.property_id ===
                                                cell.propertyId,
                                            )?.data || null
                                          }
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                          <span className="mt-2 block text-sm opacity-70 pl-[45px]">
                            Секция {sectionName}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="absolute hidden sm:flex left-0 top-[40%] w-[calc(100%+30px)] min-[1352px]:w-[calc(100%+70px)] ml-[-15px] min-[1352px]:ml-[-35px] flex-jsb-c z-[-1]">
                    <div
                      onClick={prevScroll}
                      className="swiper-button-prev-header-slider w-8 md:w-[50px] h-8 md:h-[50px] bg-[#ce2432] rounded-full flex-jc-c cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <i className="fa-solid fa-chevron-right text-white transform rotate-180"></i>
                    </div>
                    <div
                      onClick={nextScroll}
                      className="swiper-button-next-header-slider w-8 md:w-[50px] h-8 md:h-[50px] bg-[#ce2432] rounded-full flex-jc-c cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <i className="fa-solid fa-chevron-right text-white"></i>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-full h-[500px] flex items-center justify-center">
              <Spinner />
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-[400px] flex items-center justify-center">
          <h3 className="text-center text-black/60 md:text-[25px]">
            Пожалуйста выбирайте объекты, чтобы посмотреть шахматку.
          </h3>
        </div>
      )}
    </div>
  );
}

export default ShakhmatContent;
