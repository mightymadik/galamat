"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Select,
  SelectItem,
} from "@heroui/react";
import SliderInput from "@/components/common/slider-input/slider-input";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";
import { floorSelectItems, motionOptionText } from "@/utils/consts";
import { useDispatch, useSelector } from "react-redux";
import { setChangeParams } from "@/redux/filter";
import { useEffect, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { motion } from "framer-motion";
import MobileHorizontalFilter from "@/components/common/horizontal-filter/mobile-horizontal-filter";

interface IThisProps {
  className?: string;
  projects: IProjectMerged[];
  onClose?: () => void;
  isCloseSelectProjects?: boolean;
  page?: "home" | "estate";
}

function HorizontalFilter({
  className,
  projects,
  onClose,
  isCloseSelectProjects = false,
  page = "home",
}: IThisProps) {
  const dispatch = useDispatch();
  const $t = useTranslate();

  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [maxArea, setMaxArea] = useState<number>(0);

  const [houses, setHouses] = useState<IHouse[] | null>(null);

  useEffect(() => {
    const getIds = projects.map((project) => project.project_id);

    ActionGetProjectsProperty("/property", {
      projectIds: getIds,
    }).then(({ data }) => {
      const maxPriceItem = data.reduce((max: any, current: any) => {
        return current.price.value > max.price.value ? current : max;
      }, data[0]);

      const maxAreaItem = data.reduce((max: any, current: any) => {
        return current.area.area_total > max.area.area_total ? current : max;
      }, data[0]);

      setMaxArea(maxAreaItem.area.area_total);
      setMaxPrice(maxPriceItem.price.value);
    });
  }, [projects]);

  useEffect(() => {
    if (filterParams.projectId) {
      ActionGetProjectsProperty("/house", {
        isArchive: false,
        status: ["AVAILABLE"],
        ...filterParams,
      }).then((result) => {
        setHouses(result.data);
      });
    }
  }, [filterParams]);

  function ChangeParams(key: string, value: string | number) {
    const _filterParams: any = { ...filterParams };

    _filterParams[key] = value;

    dispatch(setChangeParams(_filterParams));
  }

  function toggleNumber(num: number) {
    const _filterParams = { ...filterParams };

    const index = _filterParams.rooms.indexOf(num);
    const oldRooms = [..._filterParams.rooms];

    if (index === -1) {
      oldRooms.push(num);

      _filterParams.rooms = oldRooms;
    } else {
      oldRooms.splice(index, 1);

      _filterParams.rooms = oldRooms;
    }

    dispatch(setChangeParams(_filterParams));
  }

  let priceDebounceTimer: NodeJS.Timeout;

  function changeMinMaxPrice(res: number[]) {
    if (priceDebounceTimer) {
      clearTimeout(priceDebounceTimer);
    }

    priceDebounceTimer = setTimeout(() => {
      const _filterParams: any = { ...filterParams };

      _filterParams["price[min]"] = res[0];
      _filterParams["price[max]"] = res[1];

      dispatch(setChangeParams(_filterParams));
    }, 500);
  }

  function changeMinMaxPlace(res: number[]) {
    if (priceDebounceTimer) {
      clearTimeout(priceDebounceTimer);
    }

    priceDebounceTimer = setTimeout(() => {
      const _filterParams: any = { ...filterParams };

      _filterParams["area[min]"] = res[0];
      _filterParams["area[max]"] = res[1];

      dispatch(setChangeParams(_filterParams));
    }, 500);
  }

  function ClearFilter() {
    dispatch(
      setChangeParams({
        projectId: 0,
        houseId: 0,
        rooms: [],
        "price[min]": 0,
        "price[max]": 60000000,
        minFloor: 0,
        maxFloor: 0,
        "area[min]": 0,
        "area[max]": 400,
      }),
    );
  }

  return (
    <>
      <div className={clsx("filters mb-8", className)}>
        {filterParams ? (
          <>
            <div className="w-[calc(100%+40px)] ml-[-20px] h-12 flex-jsb-c text-blue font-medium border-b mb-4 mt-[-10px] px-5 flex md:hidden">
              <span>{$t("filter__")}</span>
              <i className="fa-solid fa-xmark text-[18px]" onClick={onClose} />
            </div>

            {!isCloseSelectProjects ? (
              <div className="top-info gap-1">
                {/*<div className="select-info">*/}
                {/*  <span>{$t("district")}</span>*/}

                {/*  <Select*/}
                {/*    // selectedKeys={[`${regions}`]}*/}
                {/*    className="md:w-[150px] rounded-[8px] outline outline-[1px] outline-[#b2b2b2] bg-white"*/}
                {/*    variant="bordered"*/}
                {/*    // onSelectionChange={_selectRegion}*/}
                {/*  >*/}
                {/*    /!*{[...findRegions, all]?.map((region) => (*!/*/}
                {/*    /!*  <SelectItem key={region}>{region}</SelectItem>*!/*/}
                {/*    /!*))}*!/*/}
                {/*    <SelectItem key="hello">hello</SelectItem>*/}
                {/*  </Select>*/}
                {/*</div>*/}
                <motion.div
                  initial={"init"}
                  whileInView={"animate"}
                  transition={{
                    duration: 0.5,
                    delay: 0.6,
                  }}
                  viewport={{ once: true, amount: 0.1 }}
                  variants={motionOptionText}
                  className="select-info"
                >
                  <span>{$t("residential_complex")}</span>
                  <Select
                    placeholder="Выбрайте проект"
                    selectedKeys={[`${filterParams?.projectId || 0}`]}
                    className="md:w-[150px] rounded-[8px] "
                    classNames={{
                      trigger: "bg-white",
                    }}
                    variant="flat"
                    radius="sm"
                    onSelectionChange={(e) =>
                      ChangeParams(
                        "projectId",
                        e.currentKey ? +e.currentKey : 0,
                      )
                    }
                  >
                    {projects.map((projectName: IProjectMerged) => (
                      <SelectItem key={`${projectName.project_id}`}>
                        {projectName.title}
                      </SelectItem>
                    ))}
                  </Select>
                </motion.div>
                {houses ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="select-info"
                  >
                    <span>{$t("objects_")}</span>
                    <Select
                      placeholder="Выбрайте объекты"
                      selectedKeys={[`${filterParams?.houseId || 0}`]}
                      className="md:w-[150px] rounded-[8px]"
                      classNames={{
                        trigger: "bg-white",
                      }}
                      variant="flat"
                      radius="sm"
                      onSelectionChange={(e) =>
                        ChangeParams(
                          "houseId",
                          e.currentKey ? +e.currentKey : 0,
                        )
                      }
                    >
                      {houses.map((house: IHouse) => (
                        <SelectItem key={`${house.id}`}>
                          {house.title}
                        </SelectItem>
                      ))}
                    </Select>
                  </motion.div>
                ) : null}

                <motion.div
                  initial={"init"}
                  whileInView={"animate"}
                  transition={{
                    duration: 0.5,
                    delay: 0.6,
                  }}
                  viewport={{ once: true, amount: 0.1 }}
                  variants={motionOptionText}
                  className="select-info z-[0]"
                >
                  <span>{$t("floor__")}</span>

                  <Dropdown>
                    <DropdownTrigger>
                      <Button className="md:w-[160px] rounded-[8px] outline outline-[1px] outline-[#b2b2b2]  !outline-none !flex-jsb-c bg-white">
                        {filterParams.minFloor || (
                          <span className="opacity-60">
                            {$t("select_floor")}
                          </span>
                        )}
                        <i className="fa-regular fa-chevron-down text-[12px] opacity-90"></i>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Select Floor"
                      className="max-h-[300px] overflow-y-auto"
                    >
                      {floorSelectItems.map((floor) => (
                        <DropdownItem
                          key={`floor-${floor}`}
                          onPress={() => ChangeParams("minFloor", floor)}
                        >
                          <div className="w-full flex-jsb-c">
                            {floor}
                            {floor === filterParams.minFloor ? (
                              <i className="fa-solid fa-check mr-1 text-blue"></i>
                            ) : null}
                          </div>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                </motion.div>
                <span className="reset hidden md:block" onClick={ClearFilter}>
                  {$t("reset__")}
                </span>
              </div>
            ) : null}

            <div className="bottom-info">
              <div className="room">
                <span>{$t("com__")}</span>
                <div className="items">
                  {Array.from({ length: 4 }).map((room, index) => (
                    <motion.span
                      initial="init"
                      whileInView="animate"
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                      }}
                      viewport={{ once: true, amount: 0.1 }}
                      variants={motionOptionText}
                      key={`rooms-${index}`}
                      className={clsx({
                        "!bg-blue !text-white": filterParams?.rooms?.includes(
                          index + 1,
                        ),
                      })}
                      onClick={() => toggleNumber(index + 1)}
                    >
                      {index + 1}
                    </motion.span>
                  ))}
                </div>
              </div>
              {maxPrice && maxArea ? (
                <motion.div
                  initial="init"
                  whileInView="animate"
                  transition={{
                    duration: 0.5,
                    delay: 0.9,
                  }}
                  viewport={{ once: true, amount: 0.1 }}
                  variants={motionOptionText}
                  className="filter-block mt-5 md:mt-0"
                >
                  <SliderInput
                    labelName={$t("price")}
                    min={1000000}
                    max={maxPrice}
                    step={1000}
                    typeOption="₸"
                    className="w-full md:w-[350px] mb-6"
                    onChangeInput={changeMinMaxPrice}
                  />

                  <SliderInput
                    labelName={$t("area_m")}
                    min={10}
                    max={maxArea}
                    step={0.5}
                    className="w-full md:w-[200px]"
                    onChangeInput={changeMinMaxPlace}
                  />
                </motion.div>
              ) : null}

              <div className="w-full flex-jsb-c mt-6 flex md:hidden gap-4">
                <Button
                  className="rounded-[6px] bg-blue text-white"
                  variant="flat"
                  onPress={onClose}
                >
                  {$t("projects___view")}
                </Button>
                <span
                  className="reset"
                  // onClick={ClearFilter}
                >
                  {$t("reset__")}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <MobileHorizontalFilter
        maxPrice={maxPrice}
        maxArea={maxArea}
        projects={projects}
        page={page}
      />
    </>
  );
}

export default HorizontalFilter;
