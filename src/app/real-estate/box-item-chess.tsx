import { Button, Spinner } from "@heroui/react";
import clsx from "clsx";
import { Tooltip } from "@heroui/react";
import { formatKzt, PrintMonthKz } from "@/utils/helpers";
import { Modal, ModalBody, ModalContent } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { setModalSendRequestGalaOne } from "@/redux/modals";

interface IThisProps {
  property: IProperty | null;
}

function BoxItemChess({ property }: IThisProps) {
  const dispatch = useDispatch();

  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const projects = useSelector(
    (state: IProjectsState) => state.projectsState.projects,
  );

  const [selectedProject, setSelectedProject] = useState<IProjectMerged | null>(
    null,
  );

  const [modalViewProperty, setModalViewProperty] = useState(false);
  // const [floor, setFloor] = useState<IFloor | null>(null);
  const [selectedFullPlan, setSelectedFullPlan] = useState<{
    plan: IPlan;
    property: IProperty;
  } | null>(null);

  const [ourProjectDbInfo, serOurProjectDbInfo] =
    useState<IProjectMerged | null>(null);

  function PrintTypePurpose(_property: IProperty) {
    if (_property.typePurpose === "residential") {
      return "Жилое помещение";
    }
    if (_property.typePurpose === "apartment") {
      return "Квартира";
    }
    if (_property.typePurpose === "office") {
      return "Офис";
    }
    if (_property.typePurpose === "parking") {
      return "парковка";
    }
    return "";
  }

  useEffect(() => {
    if (selectedFullPlan && selectedFullPlan?.plan?.projectId) {
      const findProject = projects.find(
        (proj) => proj.project_id === selectedFullPlan.plan.projectId,
      );
      serOurProjectDbInfo(findProject as IProjectMerged);

      setSelectedProject(findProject as IProjectMerged);
    }
  }, [selectedFullPlan]);

  if (!property) {
    return (
      <div className="bg-transparent w-8 sm:w-12 h-8 sm:h-12 flex-jc-c mb-4 text-white rounded-[6px]" />
    );
  }

  const _checkR = filterParams.rooms.includes(property.rooms_amount || 0);

  const checkRooms = filterParams.rooms.length ? !_checkR : _checkR;
  const isHidden =
    checkRooms ||
    filterParams["area[min]"] >= property.area.area_total ||
    filterParams["area[max]"] <= property.area.area_total ||
    filterParams["price[min]"] >= property.price.value ||
    filterParams["price[max]"] <= property.price.value;

  function OpenModalViewInfo() {
    if (property && property.status === "AVAILABLE" && !isHidden) {
      setModalViewProperty(true);

      ActionGetProjectsProperty("/plan", {
        isArchive: false,
        status: ["AVAILABLE"],
      }).then((result) => {
        const AllPlans: IPlan = result.data.find((plan: IPlan) =>
          plan.properties.find((id) => +id === property.id),
        );

        setSelectedFullPlan({ plan: AllPlans, property });
      });

      // ActionGetProjectsProperty("/floor", {
      //   houseId: property.house_id,
      // }).then((result) => {
      //   console.log(result, "/floor/floor/floor/floor");
      //
      //   // const fontFloor = result.find((floor: any) =>
      //   //   floor.areas.some((_a: any) => _a.propertyId === property.id),
      //   // );
      //
      //   // if (fontFloor) {
      //   //   setFloor(fontFloor);
      //   // }
      // });
    }
  }

  const baseClasses = clsx(
    "bg-blue w-10 sm:w-12 h-10 sm:h-12 flex-jc-c mb-1 sm:mb-4 text-white rounded-[6px] cursor-pointer hover:opacity-90 transition",
    {
      "!bg-blue": property.status === "AVAILABLE",
      "!bg-[#f69f13]": property.status === "BOOKED",
      "!bg-[#a7a7a7]": property.status === "UNAVAILABLE",
      "!bg-[#ce2432]": property.status === "SOLD",
      "!cursor-default":
        property.status === "SOLD" || property.status === "UNAVAILABLE",
      "!opacity-30 !cursor-default": isHidden,
    },
  );

  const boxContent = (
    <div className={baseClasses} onClick={OpenModalViewInfo}>
      {property.rooms_amount}
    </div>
  );

  return (
    <>
      {isHidden ? (
        boxContent
      ) : (
        <Tooltip
          content={
            <div className="px-1 py-2">
              <div className="flex-jsb-c gap-4">
                <div className="w-full flex-js-c">
                  <div className="w-8 h-8 bg-blue rounded-[6px] flex-jc-c text-white mr-2">
                    {property.rooms_amount}
                  </div>
                  {PrintTypePurpose(property)}
                </div>
                <b>№{property.number}</b>
              </div>
              {/*<div className="mt-4 text-[25px] font-medium">*/}
              {/*  {formatKzt(property.price.value)}*/}
              {/*</div>*/}
              <div className="flex-js-c gap-2 mt-2">
                <span className="text-[13px]">
                  {property.area.area_total}/м²
                </span>
                {/*| /!*<span className="text-[13px]">*!/*/}
                {/*  {formatKzt(property.price.value / property.area.area_total)}{" "}*/}
                {/*  м²*/}
                {/*</span>*/}
              </div>
            </div>
          }
        >
          {boxContent}
        </Tooltip>
      )}

      {modalViewProperty && (
        <Modal size="5xl" isOpen={modalViewProperty} hideCloseButton>
          <ModalContent className="rounded-[18px] sm:rounded-[35px] max-w-[1226px] !z-[10000000]">
            <ModalBody className="max-w-[1226px] p-4 sm:p-10">
              <div className="wrapper !p-0">
                <div className="flex-je-c mb-4 relative z-[100]">
                  <Button
                    className="text-white min-w-[24px] sm:min-w-[30px] min-h-[24px] sm:min-h-[30px] text-[20px] rounded-[7px]"
                    color="primary"
                    onPress={() => setModalViewProperty(false)}
                  >
                    <i className="fa-regular fa-xmark"></i>
                  </Button>
                </div>
                <div id="card-popup" className="sm:mt-[-60px]">
                  {selectedFullPlan ? (
                    <div className="popup-body !p-0">
                      <div className="info flex-jsb-s lg:gap-10 flex-col lg:flex-row !px-0 !max-w-full">
                        <div className="texts lg:min-w-[350px] !w-full">
                          <div className="top-info !w-full !mb-0">
                            <div className="flex-js-c gap-4">
                              <h2>
                                ЖК {selectedFullPlan.property.projectName}
                              </h2>
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
                              {selectedProject ? (
                                <div>
                                  <h4 className="text-[13px] text-blue">
                                    Срок сдачи:
                                  </h4>
                                  <h3 className="text-[18px] sm:text-[26px] text-blue font-medium">
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
                              ) : null}
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
                                  {formatKzt(
                                    selectedFullPlan.property.price.value /
                                      selectedFullPlan.property.area.area_total,
                                  )}
                                </h3>
                              </div>
                            </div>

                            <div className="flex-js-c gap-4 mb-4">
                              <Link
                                href={selectedFullPlan.plan?.image?.big}
                                target="_blank"
                                className="download !rounded-full !mb-0"
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
                            <div className="w-full flex-jsb-e gap-4">
                              {ourProjectDbInfo?.page_url && (
                                <Link
                                  href={ourProjectDbInfo.page_url}
                                  className="view"
                                  target="_blank"
                                >
                                  Смотреть проект
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="img-wrap">
                          <Link
                            href={selectedFullPlan?.plan?.image?.big}
                            target="_blank"
                            className="w-full"
                          >
                            <img
                              src={selectedFullPlan?.plan?.image?.big}
                              alt=""
                              className="w-full sm:min-w-[470px]"
                            />
                          </Link>
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
      )}
    </>
  );
}

export default BoxItemChess;
