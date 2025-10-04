import Image from "next/image";
import { Button, Divider } from "@heroui/react";
import { formatKzt } from "@/utils/helpers";
import React, { useState } from "react";
import ModalChangeHouse from "@/app/admin/projects/houses/[id]/modal-change-house";

interface IThisProps {
  house: IHouse;
}

function HouseItem({ house }: IThisProps) {
  const [modalCreateObjectHouse, setModalCreateObjectHouse] = useState(false);

  return (
    <>
      <div className="w-full bg-black/5 p-4 rounded-[12px] cursor-pointer group">
        <div className="w-full h-[300px] relative rounded-[10px] overflow-hidden">
          <Image
            src={house.image}
            alt="house image"
            width={500}
            height={500}
            className="w-full h-full object-cover transition group-hover:scale-[1.02]"
          />
          <Button
            className="absolute right-2 bottom-2"
            color="primary"
            onPress={() => setModalCreateObjectHouse(true)}
          >
            Создать объекты
          </Button>
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
              <h3 className="text-[15px]">от {formatKzt(house.minPrice)}</h3>
              <h3 className="text-[15px]">
                от {formatKzt(house.minPriceArea)}/м²
              </h3>
            </div>
          </div>
        </div>
      </div>

      {modalCreateObjectHouse ? (
        <ModalChangeHouse
          status={modalCreateObjectHouse}
          onClose={() => setModalCreateObjectHouse(false)}
          house={house}
        />
      ) : null}
    </>
  );
}

export default HouseItem;
