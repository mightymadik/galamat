"use client";

import "./_your-leaut.scss";
import "@/app/real-estate/_card-popup.scss";

import React, { useEffect, useRef, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { formatKzt, PrintMonthKz } from "@/utils/helpers";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { Button, Modal, ModalBody, ModalContent, Spinner } from "@heroui/react";
import Link from "next/link";
import { setModalSendRequestGalaOne } from "@/redux/modals";
import ImageMapper from "react-img-mapper";

moment.locale("ru");

const PROJECT_ID_GALA_ONE = 54255;
const HOUSE_ID_GALA_ONE = 142663;

function YourLayout() {
  const dispatch = useDispatch();

  const allPlans = useRef<IPlan[]>([]);

  useEffect(() => {
    ActionGetProjectsProperty("/plan", {
      isArchive: false,
      status: ["AVAILABLE"],
      projectId: PROJECT_ID_GALA_ONE,
    }).then((result) => {
      const data: IPlan[] = result.data;
      allPlans.current = data;
    });
  }, []);

  const [plans, setPlans] = useState<IPlan[] | null>(null);
  function FindAllProperty(ids: number[]) {
    const findAllPlans = ids.flatMap((_id: number) =>
      allPlans.current
        .filter((plan) => plan.properties.includes(String(_id)))
        .map((plan) => ({ ...plan, propertyId: _id })),
    );

    setPlans(findAllPlans);

    if (window.innerWidth < 767) {
      setModalViewPlansMobile(true);
    }
  }

  const boards = useRef<IBoard | null>(null);

  useEffect(() => {
    ActionGetProjectsProperty("/board", {
      houseId: HOUSE_ID_GALA_ONE,
    }).then((result) => {
      boards.current = result;
      if (window.innerWidth > 767) {
        fetchTooltipData(1);
      }
    });
  }, [HOUSE_ID_GALA_ONE]);

  const fetchTooltipData = (polygonId: number) => {
    if (boards && boards.current) {
      const propertyIds: number[] = boards.current.floors
        .map((floor) => floor.sections.find((sec) => sec.number === polygonId))
        .filter((sec): sec is ISection => Boolean(sec))
        .flatMap((sec) => sec.cells)
        .map((c) => c.propertyId)
        .filter((id): id is number => id !== null);

      FindAllProperty(propertyIds);
    }
  };

  const [selectedProject, setSelectedProject] = useState<IProjectMerged | null>(
    null,
  );

  const [modalViewPlansMobile, setModalViewPlansMobile] = useState(false);
  const [modalViewProperty, setModalViewProperty] = useState(false);
  const [selectedFullPlan, setSelectedFullPlan] = useState<{
    plan: IPlan;
    property: IProperty;
  } | null>(null);

  const projects = useSelector(
    (state: IProjectsState) => state.projectsState.projects,
  );

  function OpenModalViewInfo(plan: any) {
    setModalViewProperty(true);

    ActionGetProjectsProperty("/property", {
      status: ["AVAILABLE"],
      id: plan.propertyId,
    }).then((result) => {
      setSelectedFullPlan({ plan, property: result.data[0] });
    });

    const findProject = projects.find(
      (proj) => proj.project_id === PROJECT_ID_GALA_ONE,
    );

    setSelectedProject(findProject || null);
  }

  const [selectedArea, setSelectedArea] = useState<IArea | null>(null);

  const myRef = useRef(null);

  const name = "my-image-map";
  const areas = [
    {
      id: "1",
      title: "Секция 1",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [350, 360, 425, 490],
    },
    {
      id: "2",
      title: "Секция 2",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [360, 490, 425, 615],
    },
    {
      id: "3",
      title: "Секция 3",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [260, 611, 385, 685],
    },
    {
      id: "4",
      title: "Секция 4",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [130, 611, 255, 685],
    },
    {
      id: "5",
      title: "Секция 5",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [95, 490, 165, 615],
    },
    {
      id: "6",
      title: "Секция 6",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [90, 360, 165, 490],
    },
    {
      id: "7",
      title: "Секция 7",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [70, 235, 145, 360],
    },
    {
      id: "8",
      title: "Секция 8",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [75, 110, 145, 235],
    },
    {
      id: "9",
      title: "Секция 9",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [105, 40, 230, 110],
    },
    {
      id: "10",
      title: "Секция 10",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [235, 70, 360, 140],
    },
    {
      id: "11",
      title: "Секция 11",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [360, 105, 430, 230],
    },
    {
      id: "12",
      title: "Секция 12",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [555, 110, 685, 180],
    },
    {
      id: "13",
      title: "Секция 13",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [685, 145, 810, 215],
    },
    {
      id: "14",
      title: "Секция 14",
      shape: "rect",
      fillColor: "rgba(127,2,23,0.44)",
      strokeColor: "black",
      coords: [810, 180, 885, 310],
    },
  ];

  return (
    <>
      <div className="your-layout !mt-10">
        <div className="wrapper">
          <h2>Выберите свою планировку</h2>
          <div className="info">
            <div className="images md:pb-10 md:!h-[730px] hidden md:block">
              <div className="scroll h-full">
                {plans?.map((plan, i) => (
                  <div
                    className="img p-4 md:p-6 bg-[#E8EAEF] hover:bg-[#E8EAEF]/80 mr-2 rounded-[10px] cursor-pointer !w-[95%]"
                    onClick={() => OpenModalViewInfo(plan)}
                    key={i}
                  >
                    <img
                      src={plan.image.preview}
                      alt="plan image"
                      className="rounded-[10px] !h-auto !w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="planing-info !h-[730px] w-full relative min-w-[970px] overflow-hidden">
              <ImageMapper
                ref={myRef}
                src="/img/gala-one/top-view-max.webp"
                name={name}
                areas={areas}
                width={1000}
                height={1000}
                onClick={(area) => {
                  fetchTooltipData(+area.id);
                  setSelectedArea(area as IArea);
                }}
              />

              <i className="fa-regular fa-magnifying-glass-plus absolute top-4 right-4 text-[30px] text-[#7F0217]"></i>
            </div>
          </div>
        </div>
      </div>

      <Modal
        size="full"
        isOpen={modalViewPlansMobile}
        onClose={() => setModalViewPlansMobile(false)}
      >
        <ModalContent className="rounded-[18px] sm:rounded-[35px] max-w-[1226px]">
          <ModalBody className="max-w-[1226px] p-4">
            <h3 className="mb-2 font-medium">
              Планировки {selectedArea?.title}
            </h3>
            <div className="w-full max-h-[calc(100dvh-50px)] grid grid-cols-2 gap-y-4 overflow-y-auto pb-10">
              {plans?.map((plan, i) => (
                <div
                  className="img p-1 bg-[#7F0217] hover:bg-[#E8EAEF]/80 mr-2 rounded-[10px] cursor-pointer !w-[95%] relative"
                  onClick={() => OpenModalViewInfo(plan)}
                  key={i}
                >
                  <img
                    src={plan.image.preview}
                    alt="plan image"
                    className="rounded-[8px] !h-auto !w-full"
                  />
                  <i className="fa-solid fa-expand absolute right-3 top-3 text-[14px] opacity-70"></i>
                </div>
              ))}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal size="5xl" isOpen={modalViewProperty} hideCloseButton>
        <ModalContent className="rounded-[18px] sm:rounded-[35px] max-w-[1226px]">
          <ModalBody className="max-w-[1226px] p-4 sm:p-10">
            <div className="wrapper !p-0">
              <div className="flex-je-c mb-4">
                <Button
                  className="text-white min-w-[24px] sm:min-w-[30px] min-h-[24px] sm:min-h-[30px] text-[20px] rounded-[7px] bg-[#7F0217]"
                  color="primary"
                  onPress={() => {
                    setModalViewProperty(false);
                    setSelectedFullPlan(null);
                  }}
                >
                  <i className="fa-regular fa-xmark"></i>
                </Button>
              </div>
              <div id="card-popup" className="">
                {selectedFullPlan ? (
                  <div className="popup-body !p-0">
                    <div className="info flex-jsb-s lg:gap-10 flex-col lg:flex-row !px-0 !max-w-full">
                      <div className="texts lg:min-w-[350px] !w-full">
                        <div className="top-info !w-full !mb-0">
                          <div className="flex-js-c gap-4">
                            <h2>ЖК {selectedFullPlan.property.projectName}</h2>
                            <span className="status !mb-2">Свободно</span>
                          </div>
                          <span className="nomer mb-0 sm:!mb:3 max-[576px]:!max-w-full">
                            {selectedFullPlan.property.rooms_amount}-комнатная
                            квартира №{selectedFullPlan.property.number}
                          </span>

                          <div className="w-full grid grid-cols-2 sm:grid-cols-3 mb-8 mt-2 sm:mt-6 gap-2 sm:gap-4">
                            <div>
                              <h4 className="text-[13px] text-blue">
                                Площадь:
                              </h4>
                              <h3 className="text-[18px] sm:text-[26px] text-blue font-medium">
                                {selectedFullPlan.property.area.area_total}м²
                              </h3>
                            </div>
                            <div>
                              <h4 className="text-[13px] text-blue">Этаж:</h4>
                              <h3 className="text-[18px] sm:text-[26px] text-blue font-medium">
                                {selectedFullPlan.property.floor}
                              </h3>
                            </div>
                            <div>
                              <h4 className="text-[13px] text-blue">
                                Срок сдачи:
                              </h4>
                              <h3 className="text-[18px] sm:text-[26px] text-blue font-medium capitalize">
                                {PrintMonthKz(
                                  +moment(
                                    selectedProject?.completion_date || "",
                                  ).format("M"),
                                  +moment(
                                    selectedProject?.completion_date || "",
                                  ).format("YYYY"),
                                )}
                              </h3>
                            </div>
                            <div className="sm:col-span-2 sm:mt-4">
                              <h4 className="text-[13px] text-blue">
                                Стоимость:
                              </h4>
                              <h3 className="text-[18px] sm:text-[26px] text-blue font-medium">
                                {formatKzt(
                                  selectedFullPlan.property.price.value,
                                )}
                              </h3>
                            </div>
                            <div className="sm:mt-4">
                              <h4 className="text-[13px] text-blue">
                                Стоимость за м²:
                              </h4>
                              <h3 className="text-[18px] sm:text-[26px] text-blue font-medium">
                                {selectedFullPlan.property.price.value ? (
                                  formatKzt(
                                    selectedFullPlan.property.price.value /
                                      selectedFullPlan.property.area.area_total,
                                  )
                                ) : (
                                  <span className="text-[15px] underline opacity-70 cursor-default">
                                    Скоро будет видно{" "}
                                  </span>
                                )}
                              </h3>
                            </div>
                          </div>

                          <div className="flex-js-c gap-4 mb-4">
                            <Link
                              href={selectedFullPlan.plan.image.big}
                              target="_blank"
                              className="download !rounded-full !mb-0 border w-10 h-10 flex-jc-c border-blue"
                              download={`${selectedFullPlan.property.projectName}-${selectedFullPlan.property.id}.jpeg`}
                            >
                              <img src="/img/download-icon.svg" alt="" />
                            </Link>
                            <Button
                              color="primary"
                              className="border border-blue rounded-full"
                              variant="bordered"
                              onPress={() =>
                                dispatch(
                                  setModalSendRequestGalaOne(
                                    `№${selectedFullPlan.property.number}`,
                                  ),
                                )
                              }
                            >
                              Оставить заявку
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="img-wrap">
                        <img
                          src={selectedFullPlan.plan.image.big}
                          alt=""
                          className="w-full h-auto max-[768px]:!max-h-[200px]"
                          height={500}
                          width={400}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[400px] flex-jc-c">
                    <Spinner />
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export default YourLayout;
