"use client";

import "../home/filter-wrapper/filter-wrapper.scss";
import "./real-estate.scss";
import MainTemplate from "@/components/common/main-template/main-template";
import HorizontalFilter from "@/components/common/horizontal-filter/horizontal-filter";
import React, { useEffect, useState } from "react";
import "react-photo-view/dist/react-photo-view.css";
import CanvasViewHouse from "@/app/real-estate/canvas-view-house";
import { useDispatch, useSelector } from "react-redux";
import { setHouse, setObjectInfo } from "@/redux/modals";
import IconShakhmat from "@/components/common/icons/icon-shakhmat";
import ShakhmatContent from "@/app/real-estate/shakhmat-content";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { useTranslate } from "@/hooks/useTranslate";
import { SITE_URL } from "@/utils/consts";
import { useSearchParams } from "next/navigation";
import { setProjects } from "@/redux/projects";

interface IThisProps {
  projects: IProjectMerged[];
}

function RealEstateContent({ projects }: IThisProps) {
  const dispatch = useDispatch();
  const $t = useTranslate();
  // Remove unused router import
  // const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    dispatch(setProjects(projects));
  }, [projects]);

  const getValidTab = (tabParam: string | null, tabsCount: number): number => {
    if (!tabParam) {
      return 0;
    }
    const tabIndex = parseInt(tabParam);
    return isNaN(tabIndex) || tabIndex < 0 || tabIndex >= tabsCount
      ? 0
      : tabIndex;
  };

  const tabItems = [
    {
      name: $t("checkerboard"),
      icon: <IconShakhmat />,
      content: <ShakhmatContent />,
    },
  ];

  const [activeTab] = useState(
    getValidTab(searchParams.get("tab"), tabItems.length),
  );

  const objectInfo = useSelector(
    (state: IModalState) => state.modals.objectInfo,
  );
  const modalSelectedHouse = useSelector(
    (state: IModalState) => state.modals.modalSelectedHouse,
  );

  useEffect(() => {
    if (modalSelectedHouse) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }
  }, [modalSelectedHouse]);

  function closeModal() {
    dispatch(setHouse(null));
    dispatch(setObjectInfo(null));
  }

  const [mobileFilter, setMobileFilter] = useState<boolean>(false);

  return (
    <MainTemplate>
      <div className="filter-wrapper">
        <div className="wrapper !pt-2">
          <Breadcrumbs className="mb-8 text-[14px]">
            <BreadcrumbItem href={SITE_URL.HOME}>{$t("home__")}</BreadcrumbItem>
            <BreadcrumbItem>{$t("real_estate")}</BreadcrumbItem>
          </Breadcrumbs>

          <HorizontalFilter
            className={mobileFilter ? "open" : ""}
            projects={projects}
            onClose={() => setMobileFilter(false)}
            page="estate"
          />
          <div className="tab2-wrap relative hidden sm:block">
            <div className="tab2 overflow-x-scroll bottom-scroll-hidden">
              <div className="tabs2">
                {tabItems.map((item) => (
                  <button key={item.name} className="tab-button border-none">
                    {item.icon}
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hidden mobile tab navigation */}
          {/* 
          <div className="mb-4 w-[calc(100%-50px)] ml-[50px] mt-[-65px] block sm:hidden">
            <div className="w-full overflow-x-auto bottom-scroll-hidden">
              <div className="flex-js-c gap-2 w-[750px]">
                {tabItems.map((item, i) => (
                  <Button
                    key={item.name}
                    className="rounded-[4px] bg-white text-[12px]"
                  >
                    {item.icon}
                    {item.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          */}

          {tabItems[activeTab].content}
        </div>
      </div>

      {objectInfo && modalSelectedHouse ? (
        <CanvasViewHouse
          house={modalSelectedHouse}
          objectInfo={objectInfo}
          onClose={closeModal}
          projects={projects}
        />
      ) : null}
    </MainTemplate>
  );
}

export default RealEstateContent;
