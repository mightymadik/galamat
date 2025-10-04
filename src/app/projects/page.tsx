import React from "react";
import Projects from "@/components/layout/projects/projects";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";
import { fetchHouses } from "@/lib/getHouses";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [housesData, housesDataAdmin] = await Promise.all([
    fetchHouses(),
    ActionGetProjectsInfo(),
  ]);

  return (
    <Projects
      houses={housesData as IProjectStage[]}
      housesDataAdmin={housesDataAdmin.data as IProjectData[]}
    />
  );
}
