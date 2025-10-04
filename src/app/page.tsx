"use server";

import React from "react";
import Home from "@/components/layout/home/home";
import { fetchHouses } from "@/lib/getHouses";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";
import { mergeComplexesWithProjects } from "@/utils/helpers";

async function Page() {
  const [housesData, housesDataAdmin] = await Promise.all([
    fetchHouses(),
    ActionGetProjectsInfo(),
  ]);
  const mergeProjectProfitDb: IProjectMerged[] = mergeComplexesWithProjects(
    housesData,
    housesDataAdmin.data as any,
  ).filter((project) => !project.hide);

  return <Home projects={mergeProjectProfitDb} />;
}

export default Page;
