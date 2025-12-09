import { useState } from "react";
import ProductItem from "@/components/common/product-item/product-item";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";
import { mergeComplexesWithProjects } from "@/utils/helpers";

interface IThisProps {
  houses: IProjectStage[];
  housesDataAdmin: IProjectData[];
}

function Facade({ houses, housesDataAdmin }: IThisProps) {
  const $t = useTranslate();

  const mergeProjectProfitDb: IProjectMerged[] = mergeComplexesWithProjects(
    houses,
    housesDataAdmin,
  ).filter((project) => !project.hide);

  const [countSplits, setCountSplits] = useState<number>(6);

  function SeeMore() {
    setCountSplits(countSplits + 6);
  }

  const result = mergeProjectProfitDb.slice(0, countSplits);

  return (
    <div
      className={clsx(
        "w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ",
        {
          grid: result.length,
        },
      )}
    >
      {result?.length ? (
        <>
          {result.map((project: IProjectMerged) => (
            <ProductItem key={`complex-${project.id}`} project={project} />
          ))}
        </>
      ) : (
        <div className="w-full h-[400px] flex-jc-c">
          <h3 className="text-blue text-[18px] sm:text-[24px]">
            {$t("nothing_found_yet")}
          </h3>
        </div>
      )}
    </div>
  );
}

export default Facade;
