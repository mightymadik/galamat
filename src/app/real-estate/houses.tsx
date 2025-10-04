"use client";

import React, { useEffect, useState } from "react";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import Image from "next/image";
import { formatKzt, getSalesStatus } from "@/utils/helpers";
import { addToast, Divider } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { ActionGetObjectInfo } from "@/app/actions/admin/objects/get-object-info";
import { useDispatch, useSelector } from "react-redux";
import { setHouse, setObjectInfo } from "@/redux/modals";
import { ActionGetObject } from "@/app/actions/admin/objects/get-objects";

interface IThisProps {
  projectsIds: number[];
}

function Houses({ projectsIds }: IThisProps) {
  const dispatch = useDispatch();
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [houses, setHouses] = useState<IHouse[] | null>(null);

  useEffect(() => {
    ActionGetProjectsProperty("/house", {
      isArchive: false,
      status: ["AVAILABLE"],
      projectIds: projectsIds,
      ...filterParams,
    }).then((result) => {
      setHouses(result.data);
    });
  }, [filterParams]);

  function StartViewObject(house: IHouse) {
    addToast({
      title: "Подождите пожалуйста",
      color: "warning",
    });

    ActionGetObjectInfo(house.id, "/house").then((res) => {
      if (res.status) {
        const object: any = { ...res.data };

        ActionGetObject(object.id).then((resultObjects) => {
          dispatch(setHouse(house));
          dispatch(setObjectInfo(resultObjects.data as IObjectData[]));

          addToast({
            title: "Спасибо, можете смотреть ",
            color: "success",
          });
        });
      }
    });
  }

  const FilteredHouses = filterParams.houseId
    ? houses?.filter((house) => house.id === filterParams.houseId)
    : houses;

  return (
    <div className="w-full">
      {houses ? (
        <div className="w-full h-auto grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FilteredHouses?.map((house: IHouse) => (
            <div
              key={`house-${house.id}`}
              className="w-full bg-white p-4 rounded-[12px] cursor-pointer group"
              onClick={() => StartViewObject(house)}
            >
              <div className="w-full h-[300px] relative rounded-[10px] overflow-hidden">
                <Image
                  src={house.image}
                  alt="house image"
                  width={500}
                  height={500}
                  className="w-full h-full object-cover transition group-hover:scale-[1.02]"
                />
                <div className="bg-green-600 absolute bottom-6 right-0 px-2 text-white py-1 flex-je-c gap-2 text-[14px]">
                  {getSalesStatus(house.salesStart)}
                  <i className="fa-light fa-arrow-right"></i>
                </div>
                <div className="bg-white absolute bottom-6 left-0 px-2 text-blue py-1 flex-je-c gap-2 text-[14px]">
                  <b>{house.maxFloor}</b> этажей
                </div>
              </div>
              <div className="px-2 py-4 pb-0">
                <div className="mt-[-10px] text-[14px] text-black/70">
                  {house.salesStart?.year}/{house.salesStart?.month}
                </div>
                <h2 className="font-medium text-[24px]">{house.title}</h2>
                <div className="flex-js-c">
                  <span className="text-black/60 mr-2">Адрес:</span>{" "}
                  {house.address.full}
                </div>

                <Divider className="my-4" />

                <div className="w-full flex-jsb-s">
                  <h4 className="text-blue">
                    <b>{house.propertyCount}</b> квартир{" "}
                  </h4>
                  <div className="text-right">
                    <h3 className="text-[15px]">
                      от {formatKzt(house.minPrice)}
                    </h3>
                    <h3 className="text-[15px]">
                      от {formatKzt(house.minPriceArea)}/м²
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-[300px] flex-jc-c">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default Houses;
