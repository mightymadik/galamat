"use client";

import "react-photo-view/dist/react-photo-view.css";
import "./gala-one.scss";

import MainTemplate from "@/components/common/main-template/main-template";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { SITE_URL } from "@/utils/consts";
import React, { useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import GalaOneHero from "@/app/projects/gala-one/components/hero/hero";
import HeroSlider from "@/app/projects/gala-one/components/hero-slider/hero-slider";
import GalaLocation from "@/app/projects/gala-one/components/gala-location/gala-location";
import Map from "@/app/projects/gala-one/components/map/map";
import LeaveRequest from "@/components/common/leave-request/leave-request";
import InformationBlock from "@/app/projects/gala-one/components/information-block/information-block";
import MaxSlider from "@/app/projects/gala-one/components/max-slider/max-slider";
import Tour3d from "@/app/projects/gala-one/components/tour-3d/tour-3d";
import YourLayout from "@/app/projects/gala-one/components/your-layout/your-layout";
import { setProjects } from "@/redux/projects";
import { useDispatch } from "react-redux";

interface IThisProps {
  projects: IProjectMerged[];
}

function GalaOne({ projects }: IThisProps) {
  const dispatch = useDispatch();
  const $t = useTranslate();

  useEffect(() => {
    dispatch(setProjects(projects));
  }, [projects]);

  return (
    <MainTemplate className="gala-one-page">
      <div className="pt-6 md:!pt-10">
        <div className="wrapper">
          <Breadcrumbs className="mb-6 md:mb-10 text-[14px]">
            <BreadcrumbItem href={SITE_URL.HOME}>{$t("home__")}</BreadcrumbItem>
            <BreadcrumbItem href={SITE_URL.PROJECTS}>
              {$t("projects")}
            </BreadcrumbItem>
            <BreadcrumbItem>ЖК Gala One</BreadcrumbItem>
          </Breadcrumbs>
        </div>

        <GalaOneHero />

        <HeroSlider />

        <GalaLocation />

        <Map />

        <LeaveRequest
          background={"/img/gala-request-bg.png"}
          bgColorBtn="red"
        />

        <InformationBlock />

        <MaxSlider />

        <LeaveRequest
          background={"/img/gala-request-bg.png"}
          bgColorBtn="red"
        />

        <Tour3d />

        <YourLayout />

        <LeaveRequest
          background={"/img/gala-request-bg.png"}
          bgColorBtn="red"
        />
      </div>
    </MainTemplate>
  );
}

export default GalaOne;
