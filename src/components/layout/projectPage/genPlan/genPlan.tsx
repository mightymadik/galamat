import GenPlanClient from "./genPlanClient";
import { ProjectGenPlanDataItem } from "@/types/projectPage";

export default async function GenPlan({ projectSlug }: { projectSlug?: ProjectGenPlanDataItem }) {
    if (projectSlug) {
    return <GenPlanClient genPlanData={[projectSlug]} />;
    }

    return null;
}