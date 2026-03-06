import PlansClient from "./plansClient";
import { ProjectPlansDataItem } from "@/types/projectPage";

export default async function Plans({ projectSlug }: { projectSlug?: ProjectPlansDataItem[] }) {
    if (projectSlug && projectSlug.length > 0) {
        return <PlansClient plansData={projectSlug} />;
    }
    
    return null;
}