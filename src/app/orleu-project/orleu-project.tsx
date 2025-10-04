"use client";

import React, { useEffect, useState } from "react";
import MainTemplate from "@/components/common/main-template/main-template";
import ContentOrleuProject from "@/components/layout/orleu-project/content-orleu-project";
import ContentOrleuProjectTwo from "@/components/layout/orleu-project/content-orleu-project-two";
import ContentOrleuProjectSlider from "@/components/layout/orleu-project/content-orleu-project-slider";
import ContentOrleuProjectList from "@/components/layout/orleu-project/content-orleu-project-list";
import ContentOrleuProjectMap from "@/components/layout/orleu-project/content-orleu-project-map";
import ContentOrleuProjectHomeMap from "@/components/layout/orleu-project/content-orleu-project-home-map";
import ContentOrleuProjectAllHotelSlider from "@/components/layout/orleu-project/content-orleu-project-all-hotel-slider";
import ContentOrleuProjectAlPanorama from "@/components/layout/orleu-project/content-orleu-project-panarama";
import ContentOrleuEndSection from "@/components/layout/orleu-project/content-orleu-project-end-section";
import { Modal, ModalBody, ModalContent } from "@heroui/react";
import SendRequest from "@/components/layout/orleu-project/send-request";
import OreluMobileHeader from "@/components/layout/orleu-project/orelu-mobile-header";
import ContentOrleuProjectSliderMobile from "@/components/layout/orleu-project/content-orleu-project-slider-mobile";
import Link from "next/link";
import { SITE_URL } from "@/utils/consts";
import ShakhmatContent from "@/app/real-estate/shakhmat-content";
import { setChangeParams } from "@/redux/filter";
import { useDispatch, useSelector } from "react-redux";

function OrleuProject() {
  const dispatch = useDispatch();

  const filterParams = useSelector(
    (state: IFilterParamsState) => state.filterParams.params,
  );

  const [isOpen, setIsOpen] = useState(false);

  function ChangeParams(value: string | number) {
    const _filterParams: any = { ...filterParams };

    _filterParams["houseId"] = value;

    dispatch(setChangeParams(_filterParams));
  }

  useEffect(() => {
    ChangeParams(137486);
  }, []);

  return (
    <MainTemplate footer={false} headerInfo={false}>
      <div className="w-full h-full bg-white pt-5">
        <div className="wrapper">
          <div className="breadcrumbs">
            <Link href={SITE_URL.HOME}>Главная</Link>
            <Link href={SITE_URL.PROJECTS}>Проекты</Link>
            <span>ЖК Orleu</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <ContentOrleuProject sendRequest={() => setIsOpen(true)} />

          <ContentOrleuProjectTwo />
        </div>

        <div className="block lg:hidden">
          <OreluMobileHeader sendRequest={() => setIsOpen(true)} />
        </div>

        <div className="hidden md:block">
          <ContentOrleuProjectSlider />
        </div>

        <div className="block md:hidden">
          <ContentOrleuProjectSliderMobile />
        </div>

        <ContentOrleuProjectList />

        <ContentOrleuProjectMap />

        <ContentOrleuProjectHomeMap sendRequest={() => setIsOpen(true)} />

        <ContentOrleuProjectAllHotelSlider />

        <ContentOrleuProjectAlPanorama />

        <section className="section section8 relative">
          <div className="planning-wrap relative !z-[10]">
            <div className="title-wrap max-[500px]:!mb-4">
              <h2>Шахматка</h2>
            </div>
            <ShakhmatContent />
          </div>
        </section>

        <ContentOrleuEndSection />
      </div>

      <Modal size="2xl" isOpen={isOpen} onOpenChange={() => setIsOpen(false)}>
        <ModalContent className="bg-[#1A3B7E]">
          <ModalBody>
            <SendRequest className="!px-4 pb-6 !pt-0 mt-6" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </MainTemplate>
  );
}

export default OrleuProject;
