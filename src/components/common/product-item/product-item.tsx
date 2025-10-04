import Image from "next/image";
import PrintStatus from "@/components/common/product-item/print-status";
import { formatPrice } from "@/utils/consts";
import { useDispatch, useSelector } from "react-redux";
import { setChangeParams } from "@/redux/filter";

interface IThisProps {
  project: IProjectMerged;
}

function ProductItem({ project }: IThisProps) {
  const dispatch = useDispatch();

  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  function ChangeParams(key: string, value: string | number) {
    const _filterParams: any = { ...filterParams };

    _filterParams[key] = value;

    dispatch(setChangeParams(_filterParams));
  }

  return (
    <a
      href={project.page_url}
      onClick={() => ChangeParams("projectId", project.project_id)}
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
    </a>
  );
}

export default ProductItem;
