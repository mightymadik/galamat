import ServicesClient from "./servicesProjectClient";
import { ProjectServicesDataItem } from "@/types/projectPage";

export default async function ServicesProject({ projectSlug }: { projectSlug?: ProjectServicesDataItem[] }) {
    if (projectSlug && projectSlug.length > 0) {
        return <ServicesClient serviceData={projectSlug} />;
    }
    return null;
}