"use client";

import MainTemplate from "@/components/common/main-template/main-template";
import React, { useState } from "react";
import ProductItem from "@/components/common/product-item/product-item";
import { BreadcrumbItem, Breadcrumbs, Button } from "@heroui/react";
import clsx from "clsx";
import { useTranslate } from "@/hooks/useTranslate";
import "../home/filter-wrapper/filter-wrapper.scss";
import { mergeComplexesWithProjects } from "@/utils/helpers";
import { SITE_URL } from "@/utils/consts";

interface IThisProps {
  houses: IProjectStage[];
  housesDataAdmin: IProjectData[];
}

function Projects({ houses, housesDataAdmin }: IThisProps) {
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
    <MainTemplate>
      <div className="wrapper !pt-10">
        <Breadcrumbs className="mb-10 text-[14px]">
          <BreadcrumbItem href={SITE_URL.HOME}>{$t("home__")}</BreadcrumbItem>
          <BreadcrumbItem>{$t("projects")}</BreadcrumbItem>
        </Breadcrumbs>

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

        {result.length ? (
          <div className="show-wrap">
            <span>
              {$t("shown")}{" "}
              {countSplits >= result.length ? result.length : countSplits}{" "}
              {$t("from")} {result.length}
            </span>
            <Button
              className={clsx("show-btn bg-transparent h-[60px]", {
                "opacity-50 !cursor-default hover:opacity-50":
                  countSplits >= result.length,
              })}
              onPress={SeeMore}
              disabled={countSplits >= result.length}
            >
              {$t("show_more")}
            </Button>
          </div>
        ) : null}
      </div>
    </MainTemplate>
  );
}

export default Projects;
