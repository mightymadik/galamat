import HeroSectionClient from "./heroSectionClient";
import { ProjectHeroDataItem } from "@/types/projectPage";

export default async function HeroSection({ projectSlug }: { projectSlug?: ProjectHeroDataItem }) {
    if (projectSlug) {
        console.log(projectSlug);
        return <HeroSectionClient heroData={[projectSlug]} />;
    }

    return null;
}