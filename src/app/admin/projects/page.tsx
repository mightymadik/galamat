import Projects from "@/app/admin/projects/projects";
import { fetchHouses } from "@/lib/getHouses";
import { ActionGetProjectsInfo } from "@/app/actions/projects/get-projects";

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
