"use server";

import React from "react";
import Home from "@/components/layout/home/home";
import { fetchHouses } from "@/lib/getHouses";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";

async function Page() {
  const [housesData, housesDataAdmin] = await Promise.all([
    fetchHouses(),
    ActionGetProjectsInfo(),
  ]);

  return <Home houses={housesData} housesDataAdmin={housesDataAdmin.data as IProjectData[]} />;
}

export default Page;