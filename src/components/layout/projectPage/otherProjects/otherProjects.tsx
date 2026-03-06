import OtherProjectClient from "./otherProjectClient";
import { ProjectDetail } from "@/types/projectCatalog";

export default async function OtherProjects({ otherProjectsData }: { otherProjectsData?: ProjectDetail[] }) {
    if (otherProjectsData && otherProjectsData.length > 0) {
        return <OtherProjectClient otherProjectData={otherProjectsData} />;
    }
    return null;
}