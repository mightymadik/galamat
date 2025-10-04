import {
  addToast,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  Select,
  SelectItem,
  SharedSelection,
} from "@heroui/react";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { Spinner } from "@heroui/react";
import clsx from "clsx";
import "./_card-popup.scss";
import { ActionGetProjectInfo } from "@/app/actions/admin/projects/get-project-info";
import Link from "next/link";
import PrintPlanItem from "@/app/real-estate/print-plan-item";
import { RandomKey } from "@/utils/helpers";

interface IThisProps {
  status: boolean;
  onClose: () => void;
  plan: IFloor;
  houseId: number;
  projectId: number;
}

function DrawerViewPlansAndItems({
  status,
  onClose,
  plan,
  houseId,
  projectId,
}: IThisProps) {
  const [areas, setAreas] = useState<IProperty[] | null>(null);
  const [plans, setPlans] = useState<IPlan[] | null>(null);

  const [view, setView] = useState<"3xl" | "full">("3xl");

  const [selectedPlan, setSelectedPlan] = useState<IFloor>(plan);

  const [house, setHouse] = useState<IHouse | null>(null);

  const [allFloors, setAllFloor] = useState<IFloor[]>([]);

  const [ourProjectDbInfo, serOurProjectDbInfo] = useState<IProjectData | null>(
    null,
  );

  useEffect(() => {
    ActionGetProjectInfo(projectId).then((res) => {
      serOurProjectDbInfo(res.data as IProjectData);
    });
  }, [projectId]);

  function ChangeFloor(e: SharedSelection) {
    const value = e.currentKey;
    if (value) {
      const findFloor = allFloors.find((floor) => floor.number === +value);

      if (findFloor) {
        setSelectedPlan(findFloor);
        setAreas(null);
        setPlans(null);
      }
    }
  }

  useEffect(() => {
    if (status) {
      const createRequest = selectedPlan.areas.map((area) => {
        return ActionGetProjectsProperty("/property", {
          id: area.propertyId,
        });
      });

      Promise.all(createRequest).then((res) => {
        const _res = [...res];

        const getAreaData = _res.map((property) => property.data[0]);
        setAreas(getAreaData);

        FindAllPlans(getAreaData);
      });

      ActionGetProjectsProperty("/house", {
        id: houseId,
      }).then(({ data }) => {
        setHouse(data[0] as IHouse);
      });

      ActionGetProjectsProperty("/floor", {
        houseId,
      }).then((result) => {
        const _res: IFloor[] = [...result];

        const filter = _res.filter(
          (floor) => floor.sectionNumber === selectedPlan.sectionNumber,
        );
        setAllFloor(filter);
      });
    }
  }, [selectedPlan]);

  function FindAllPlans(_res: IProperty[]) {
    const createRequestFindPlan = _res.map((property: IProperty) => {
      return ActionGetProjectsProperty("/plan", {
        layoutCode: [property.layoutCode],
      });
    });

    Promise.all(createRequestFindPlan).then((res) => {
      const _res = [...res];

      const getPlanData = _res.map((plan: any) => plan.data[0]);

      setPlans(getPlanData);
    });
  }

  const [selectedFullPlan, setSelectedFullPlan] = useState<{
    plan: IPlan;
    property: IProperty;
  } | null>(null);

  function OpenPlanMaxView(plan: IPlan) {
    if (areas) {
      const findArea = areas?.find((_ar) => _ar?.layoutCode === plan.code);

      if (findArea?.status === "AVAILABLE") {
        setView("full");
        setSelectedFullPlan({ plan, property: findArea });
      } else {
        addToast({
          title: "Вы не можете смотреть, уже закрыто :(",
          color: "danger",
        });
      }
    }
  }

  return (
    <Drawer radius="none" size={view} isOpen={status} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerBody>
          {plans ? (
            <div className="flex-jsb-s h-full">
              <div
                className={clsx("w-full pr-4 h-full border-black/20", {
                  "max-w-full": view === "3xl",
                  "max-w-[600px] border-r hidden md:!block": view === "full",
                })}
              >
                {house ? (
                  <div className="w-full flex-je-c mt-8">
                    <Select
                      className="w-[140px] rounded-[6px] "
                      placeholder={`${selectedPlan.number}/${house.maxFloor} Этажей`}
                      onSelectionChange={ChangeFloor}
                      variant="bordered"
                      color="primary"
                    >
                      {Array.from({ length: house.maxFloor }).map((_, i) => (
                        <SelectItem key={i + 1}>{i + 1}</SelectItem>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {view === "3xl" ? (
                  <>
                    <div className="w-full cursor-pointer">
                      <Image
                        src={selectedPlan.images.big}
                        alt="big image plan"
                        width={1000}
                        height={500}
                        className="w-full mt-3 !h-auto"
                      />
                    </div>

                    <Divider className="mt-4 mb-8" />
                  </>
                ) : null}

                <div className="mt-4">
                  {plans.map((_plan) => (
                    <PrintPlanItem
                      key={RandomKey()}
                      _plan={_plan}
                      OpenPlanMaxView={(plan: IPlan) => OpenPlanMaxView(plan)}
                      areas={areas}
                    />
                  ))}
                </div>
              </div>

              {view === "full" && selectedFullPlan ? (
                <div
                  id="card-popup"
                  className=" white-popup mfp-with-anim w-full h-full !bg-white"
                >
                  <div className="popup-body h-full">
                    <div className="info h-full">
                      <div className="w-full flex-js-s md:flex-jsb-e gap-6 pr-6 flex-col md:flex-row">
                        <div className="texts w-full">
                          <div className="top-info w-full">
                            <div className="flex-jsb-c w-full">
                              <div className="flex-js-c gap-4">
                                <h2>
                                  ЖК {selectedFullPlan.property.projectName}
                                </h2>
                                <span className="status !mb-1">Свободно</span>
                              </div>

                              {ourProjectDbInfo?.page_url ? (
                                <Link
                                  href={ourProjectDbInfo?.page_url}
                                  className="view"
                                  target="_blank"
                                >
                                  Смотреть проект
                                </Link>
                              ) : null}
                            </div>
                            <span className="nomer !max-w-full">
                              {selectedPlan.areas.length}-комнатная квартира
                            </span>
                            {ourProjectDbInfo?.file_url ? (
                              <Link
                                href={selectedFullPlan.plan.image.big}
                                target="_blank"
                                className="download"
                                download={`${selectedFullPlan.property.projectName}-${selectedFullPlan.property.id}.jpeg`}
                              >
                                <img src="/img/download-icon.svg" alt="" />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        {/*<div className="texts w-[400px]">*/}
                        {/*  <div className="apartment-info">*/}
                        {/*    <h4>Преимущества квартиры:</h4>*/}
                        {/*    <div className="items gap-2">*/}
                        {/*      <div className="item">*/}
                        {/*        <img src="/img/apartment-img1.svg" alt="" />*/}
                        {/*        <span>Кухня- гостинная</span>*/}
                        {/*      </div>*/}
                        {/*      <div className="item">*/}
                        {/*        <img src="/img/apartment-img2.svg" alt="" />*/}
                        {/*        <span>Готовый ремонт</span>*/}
                        {/*      </div>*/}
                        {/*      <div className="item">*/}
                        {/*        <img src="/img/apartment-img3.svg" alt="" />*/}
                        {/*        <span>Солнечная сторона</span>*/}
                        {/*      </div>*/}
                        {/*    </div>*/}
                        {/*  </div>*/}
                        {/*</div>*/}
                      </div>
                      <div className="img-wrap my-4">
                        <img
                          src={selectedFullPlan.plan.image.big}
                          alt=""
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-full h-[400px] flex-jc-c">
              <Spinner />
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export default DrawerViewPlansAndItems;
