import MainPageProjectsServer from "./mainPageProjectsServer";
import MainPageProjects from "./mainPageProjects";

export default async function MainPageProjectsWrapper() {
    const { projects, map } = await MainPageProjectsServer();

    return (
        <MainPageProjects 
            initialProjects={projects || []} 
            mapData={map || []}
            showFilter
        />
    );
}
