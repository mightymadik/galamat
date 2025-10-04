import "./_checkerboard.scss";

import React, { useEffect, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import BoxItemChess from "@/app/real-estate/box-item-chess";
import { ActionGetProperty } from "@/app/actions/start-crone/get-property";
import { Spinner } from "@heroui/react";
import HorizontalFilter from "@/components/common/horizontal-filter/horizontal-filter";

interface IThisProps {
  activeHouse: IObjectData | null;
  projects: IProjectMerged[];
}

function ChessView({ activeHouse, projects }: IThisProps) {
  const [boards, setBoards] = useState<IBoard | null>(null);
  const [property, setProperty] = useState<
    { id: number; property_id: number; data: IProperty }[] | null
  >(null);

  useEffect(() => {
    if (activeHouse) {
      ActionGetProjectsProperty("/board", {
        houseId: activeHouse.project_house_id,
      }).then((result) => {
        setBoards(result);
      });

      ActionGetProperty().then((data) => {
        if (data.status === "ok") {
          setProperty(data.data as any);
        }
      });
    }
  }, [activeHouse]);

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

  const [mobileFilter, setMobileFilter] = useState<boolean>(false);

  return (
    <div className="w-full h-[100dvh] bg-[#e8eaef] mt-[-25px] pt-[130px] sm:pt-[100px] px-6">
      <HorizontalFilter
        className={mobileFilter ? "open" : ""}
        projects={projects}
        isCloseSelectProjects
        onClose={() => setMobileFilter(false)}
      />

      {property ? (
        <div className="checkerboard-wrap">
          <div className="top-info">
            <div className="top-info-item">
              <span className="circle blue"></span>
              <span className="text">Свободно</span>
            </div>
            <div className="top-info-item">
              <span className="circle red"></span>
              <span className="text">Продано</span>
            </div>
            <div className="top-info-item">
              <span className="circle yellow"></span>
              <span className="text">Бронь</span>
            </div>
            <div className="top-info-item">
              <span className="circle grey"></span>
              <span className="text">Не для продажи</span>
            </div>
          </div>
          {boards ? (
            <div className="flex-jsb-c overflow-x-scroll bottom-scroll-hidden">
              {Object.entries(groupedBySection).map(
                ([sectionName, sectionFloors], idx) => (
                  <div key={`section-${idx}`} className="checkerboard-item">
                    <div className="sect-table w-full flex-js-c">
                      <div>
                        {sectionFloors
                          .sort((a, b) => b.floor - a.floor)
                          .map((floorItem, i) => (
                            <div
                              key={`floor-${i}`}
                              className="flex items-center gap-4 mb-1"
                            >
                              <div className="w-[20px] text-sm font-semibold text-gray-600 text-right">
                                {floorItem.floor}.
                              </div>

                              <div className="flex gap-1 sm:gap-3">
                                {floorItem.cells.map((cell, ci) => (
                                  <BoxItemChess
                                    key={`cell-${ci}`}
                                    property={
                                      property?.find(
                                        (_pr) =>
                                          _pr.property_id === cell.propertyId,
                                      )?.data || null
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    <span className="title ml-[20px]">
                      Секция {sectionName}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="w-full h-[500px] flex-jc-c">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default ChessView;
