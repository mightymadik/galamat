import { fetchHouses } from "@/lib/getHouses";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";
import { mergeComplexesWithProjects } from "@/utils/helpers";
import GalaOne from "@/app/projects/gala-one/gala-one-page";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Gala One — купить квартиру в новостройке Астаны | Galamat",
  };
}

async function RealEstate() {
  const [housesData, housesDataAdmin] = await Promise.all([
    fetchHouses(),
    ActionGetProjectsInfo(),
  ]);
  const mergeProjectProfitDb: IProjectMerged[] = mergeComplexesWithProjects(
    housesData,
    housesDataAdmin.data as any,
  ).filter((project) => !project.hide);

  return <GalaOne projects={mergeProjectProfitDb} />;
}

export default RealEstate;
