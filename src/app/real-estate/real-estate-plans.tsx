"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ActionGetProjectsProperty } from "@/app/actions/projects/get-projects-property";
import { Spinner, Pagination } from "@heroui/react";
import PlanItem from "@/app/real-estate/plan-item";
import { useSelector } from "react-redux";

interface IThisProps {
  projectsIds: number[];
}

const ITEMS_PER_PAGE = 12;

function RealEstatePlans({ projectsIds }: IThisProps) {
  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<IPlan[] | null>(null);

  const initialPageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  const [currentPage, setCurrentPage] = useState<number>(
    isNaN(initialPageFromUrl) ? 1 : initialPageFromUrl,
  );

  useEffect(() => {
    const _filterParams: any = { ...filterParams };

    if (!_filterParams.projectId) {
      delete _filterParams["projectId"];
    }

    if (!_filterParams.houseId) {
      delete _filterParams["houseId"];
    } else {
      _filterParams.houseId = [filterParams.houseId];
    }

    setPlans(null);

    ActionGetProjectsProperty("/plan", {
      isArchive: false,
      status: ["AVAILABLE"],
      ...(!filterParams.projectId && { projectIds: projectsIds }),
      ..._filterParams,
    }).then((result) => {
      const data: IPlan[] = result.data;
      setPlans(data);
      setCurrentPage(isNaN(initialPageFromUrl) ? 1 : initialPageFromUrl);
    });
  }, [filterParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPlans = plans?.slice(startIndex, endIndex) || [];

  return (
    <div className="cards-wrap">
      {plans ? (
        <>
          {plans.length ? (
            <div className="cards">
              {currentPlans.map((plan: IPlan) => (
                <PlanItem
                  key={`key-plan-${plan.id}`}
                  plan={plan}
                  plans={plans}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-[400px] flex items-center justify-center">
              <h3 className="text-center text-black/60 md:text-[25px]">
                Пока что у нас нет, соответствующего указанным параметрам.
              </h3>
            </div>
          )}

          <div className="flex-jc-c sm:flex-je-c gap-4 mt-6 flex-col sm:flex-row">
            <span>
              Показано {startIndex + currentPlans.length} из {plans.length}
            </span>

            {plans.length > ITEMS_PER_PAGE && (
              <Pagination
                initialPage={currentPage}
                total={Math.ceil(plans.length / ITEMS_PER_PAGE)}
                onChange={(page) => setCurrentPage(page)}
                classNames={{
                  cursor: "text-white",
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="w-full h-[400px] flex-jc-c">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default RealEstatePlans;
