"use client";

import MainTemplate from "@/components/common/main-template/main-template";
import AdsSlider from "@/components/layout/home/ads-slider/ads-slider";
import LeaveRequest from "@/components/common/leave-request/leave-request";
import WhyUs from "@/components/layout/home/why-us/why-us";
import Objects from "@/components/layout/home/objects/objects";
import VideoBlock from "@/components/layout/home/video-block/video-block";
import OurOffice from "@/components/layout/home/our-office/our-office";
import React from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { motion } from "framer-motion";
import { motionOptionText } from "@/utils/consts";
import Filter from "./filter/filter";

interface IThisProps {
  houses: IProjectStage[];
  housesDataAdmin: IProjectData[];
}

export default function Home({ houses, housesDataAdmin }: IThisProps) {
  const $t = useTranslate();

  // useEffect(() => {
  //   axios
  //     .post("/api/change-client-status", {
  //       phone: "sssss",
  //     })
  //     .then((res) => {
  //       console.log(res);
  //     });
  // }, []);

  return (
    <MainTemplate>
      <AdsSlider />
      <motion.div
        initial={"init"}
        whileInView={"animate"}
        transition={{
          duration: 0.5,
          delay: 0.5,
        }}
        viewport={{ once: true, amount: 0.1 }}
        variants={motionOptionText}
      >
        <div className="wrapper">
          <h3 className="text-[32px] md:text-[45px] font-medium text-[#353535]">
            {$t("projects")} Galamat
          </h3>
        </div>
      </motion.div>

      <Filter houses={houses} housesDataAdmin={housesDataAdmin} />
      <Objects />
      <LeaveRequest />
      <WhyUs />
      <VideoBlock />
      <OurOffice />
    </MainTemplate>
  );
}