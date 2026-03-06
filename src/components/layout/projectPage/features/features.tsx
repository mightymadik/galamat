import FeaturesClient from "./featuresClient";
import { ProjectFeaturesDataItem } from "@/types/projectPage";

export default async function Features({ projectSlug }: { projectSlug?: ProjectFeaturesDataItem[] }) {
    if (projectSlug && projectSlug.length > 0) {
        return <FeaturesClient featuresData={projectSlug} />;
    }
    return null;
}