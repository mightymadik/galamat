"use server";

import React from "react";
import Hero from "@/components/layout/galaxy-star/hero/hero";
import MainTemplate from "@/components/common/main-template/main-template";
import About from "@/components/layout/galaxy-star/about/about";
import Tour from "@/components/layout/galaxy-star/tour/tour";
import Infrastructure from "@/components/layout/galaxy-star/infrastructure/infrastructure";
import Interior from "@/components/layout/galaxy-star/interior/interior";
import Alley from "@/components/layout/galaxy-star/alley/alley";
import Plans from "@/components/layout/galaxy-star/plans/plans";
import LeaveRequest from "@/components/common/leave-request/leave-request";

export async function generateMetadata() {
  return {
    title: "Galaxy-Star - Apartments in Esil District",
  };
}

async function Page() {
  return (
    <MainTemplate>
      <Hero />
      <About />
      <div className="py-[80px] py-[128px]">
        <Tour />
      </div>
      <Plans />
      <LeaveRequest project="Galaxy Star" />
      <Infrastructure />
      <Interior />
      <Alley />
    </MainTemplate>
  );
}

export default Page;
