import Image from "next/image";
import { Button } from "@heroui/react";
import { useState } from "react";
import ModalChangeProductItem from "@/app/admin/projects/modal-change-product-item";
import PrintStatus from "@/components/common/product-item/print-status";
import { formatPrice, SITE_URL } from "@/utils/consts";
import ModalChangeFosad from "@/app/admin/projects/modal-change-fosadi";
import Link from "next/link";

interface IThisProps {
  project: IProjectStage;
  housesDataAdmin: IProjectData[];
}

function ProductItemAdmin({ project, housesDataAdmin }: IThisProps) {
  const getInfoOtherProject = housesDataAdmin?.find(
    (house) => house.project_id === project.id,
  );

  const [modalChange, setModalChange] = useState<boolean>(false);
  const [modalChangeFosad, setModalChangeFosad] = useState<boolean>(false);

  return (
    <>
      <div className=" w-full bg-[#3d3d3d]/10 rounded-[16px] p-[15px] cursor-pointer group flex-jsb-c flex-col relative">
        <div className="w-full p-[15px]">
          <Link href={`/${SITE_URL.ADMIN_PROJECTS_HOUSES}/${project.id}`}>
            <h2 className="text-[22px] md:text-[28px] lg:text-[35px] font-medium">
              {project.title}
            </h2>
          </Link>
          <h3 className="text-[18px] md:text-[23px] text-[#353535]">
            {getInfoOtherProject?.address}
          </h3>
          <h3 className="text-[18px] md:text-[23px] text-[#353535] opacity-40">
            от {formatPrice(getInfoOtherProject?.min_price || 0)}
          </h3>
        </div>
        <div className="w-full h-[250px] md:h-[383px] bg-[#E0E0E0] rounded-[7px] overflow-hidden flex-jc-c relative">
          <Image
            src={project.images[0]?.url || "/img/def-proj.svg"}
            className="!rounded-[8px] w-full h-full object-cover object-center transition transform group-hover:scale-[1.05]"
            alt={project.title}
            width={700}
            height={500}
          />
          {getInfoOtherProject ? (
            <PrintStatus
              position={getInfoOtherProject.position}
              className="absolute top-4 left-4 text-white px-4 rounded-[4px]"
            />
          ) : null}
          <Button
            className="absolute right-6 bottom-6"
            onPress={() => setModalChange(true)}
          >
            Изменить
          </Button>
          <Button
            className="absolute left-6 bottom-6"
            onPress={() => setModalChangeFosad(true)}
          >
            Фасады
          </Button>
        </div>
        {getInfoOtherProject?.hide ? (
          <div className="w-8 h-8 bg-white absolute top-1 right-1 shadow rounded-full flex-jc-c text-red-600">
            <i className="fa-regular fa-eye-slash"></i>
          </div>
        ) : null}
      </div>

      {modalChangeFosad ? (
        <ModalChangeFosad
          status={modalChangeFosad}
          onClose={() => setModalChangeFosad(false)}
          project={project}
        />
      ) : null}

      {modalChange ? (
        <ModalChangeProductItem
          status={modalChange}
          onClose={() => setModalChange(false)}
          project={project}
        />
      ) : null}
    </>
  );
}

export default ProductItemAdmin;
