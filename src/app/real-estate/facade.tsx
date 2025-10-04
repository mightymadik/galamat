import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ActionGetObjectInfo } from "@/app/actions/admin/objects/get-object-info";
import CanvasView from "@/app/real-estate/canvas-view";
import { addToast } from "@heroui/react";
import { formatPrice } from "@/utils/consts";
import PrintStatus from "@/components/common/product-item/print-status";
import { useSelector } from "react-redux";

interface IThisProps {
  projects: IProjectMerged[];
  fakeItem?: number;
}

function Facade({ projects, fakeItem = 0 }: IThisProps) {
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [project, setProject] = useState<IProjectMerged | null>(null);
  const [objectInfo, setObjectInfo] = useState<IObjectData | null>(null);

  useEffect(() => {
    if (project) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }
  }, [project]);

  function StartViewObject(project: IProjectMerged) {
    addToast({
      title: "Подождите пожалуйста",
      color: "warning",
    });

    ActionGetObjectInfo(project.project_id, "/projects").then((res) => {
      if (res.status) {
        setObjectInfo(res.data as IObjectData);
        setProject(project);

        addToast({
          title: "Спасибо, можете смотреть ",
          color: "success",
        });
      }
    });
  }

  function LoseFosadView() {
    setObjectInfo(null);
    setProject(null);
  }

  const FilteredProjects = filterParams.projectId
    ? projects.filter((proj) => proj.project_id === filterParams.projectId)
    : projects;

  return (
    <div className="w-full">
      <div className="w-full h-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FilteredProjects.map((project: IProjectMerged) => (
          <div
            key={`project-itm-${project.id}`}
            onClick={() => StartViewObject(project)}
            className="w-full bg-white rounded-[16px] p-[15px] cursor-pointer group flex-jsb-c flex-col"
          >
            <div className="w-full p-[15px]">
              <h2 className="text-[22px] md:text-[28px] lg:text-[35px] font-medium">
                {project.title}
              </h2>
              <h3 className="text-[18px] md:text-[23px] text-[#353535]">
                {project?.address}
              </h3>
              <h3 className="text-[18px] md:text-[23px] text-[#353535] opacity-40">
                от {formatPrice(project?.min_price || 0)}
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
              {project.position ? (
                <PrintStatus
                  position={project.position}
                  className="absolute top-4 left-4 text-white px-4 rounded-[4px]"
                />
              ) : null}
            </div>
          </div>
        ))}

        {Array.from({ length: fakeItem }).map((_, i) => (
          <div
            key={`project-fake-${i}`}
            className="w-full bg-white p-4 rounded-[12px] cursor-pointer group hidden sm:!block"
          >
            <img
              src="/img/new-project.svg"
              alt="house image"
              className="w-full h-full object-cover transition group-hover:scale-[1.02]"
            />
          </div>
        ))}
      </div>

      {objectInfo && project ? (
        <CanvasView
          project={project}
          objectInfo={objectInfo}
          onClose={LoseFosadView}
        />
      ) : null}
    </div>
  );
}

export default Facade;
