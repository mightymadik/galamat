import AboutProjectClient from "./aboutProjectClient";
import { ProjectAboutDataItem } from "@/types/projectPage";

export default async function AboutProject({ projectSlug }: { projectSlug?: ProjectAboutDataItem }) {
  if (projectSlug) {
    return <AboutProjectClient aboutData={[projectSlug]} />;
  }
  return null;
}
