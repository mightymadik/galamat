import { fetchHouses } from "@/lib/getHouses";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";
import RealEstateContent from "@/components/layout/real-estate/real-estate-content";
import { mergeComplexesWithProjects } from "@/utils/helpers";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "Недвижимость",
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

  return <RealEstateContent projects={mergeProjectProfitDb} />;
}

export default RealEstate;
