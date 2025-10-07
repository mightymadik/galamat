import React from "react";
import Image from "next/image";
import { formatPrice } from "@/utils/consts";
import PrintStatus from "@/components/common/product-item/print-status";

interface IThisProps {
  projects: IProjectMerged[];
  fakeItem?: number;
}

function Facade({ projects, fakeItem = 0 }: IThisProps) {
  return (
    <div className="w-full">
      <div className="w-full h-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project: IProjectMerged) => (
          // Changed from onClick to href navigation, similar to projects page
          // Removed Redux dispatch since we're navigating to the project page
          <a
            key={`project-itm-${project.id}`}
            href={project.page_url}
            className="w-full bg-white rounded-[16px] p-[15px] cursor-pointer group flex-jsb-c flex-col"
          >
            <div className="w-full p-[15px]">
              <h2 className="text-[22px] md:text-[28px] lg:text-[35px] font-medium">
                {project.title}
              </h2>
              <h3 className="text-[18px] md:text-[23px] text-[#353535]">
                {project?.address}
              </h3>
              {/* Only show price if it's greater than 0 */}
              {project?.min_price > 0 ? (
                <h3 className="text-[18px] md:text-[23px] text-[#353535] opacity-40">
                  от {formatPrice(project?.min_price || 0)}
                </h3>
              ) : null}
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
          </a>
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
    </div>
  );
}

export default Facade;
