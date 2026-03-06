"use client";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import MainPageProjectsClient from "./mainPageProjectsClient";
import MainPageFilterContainer from "../../mainPageFilter/MainPageFilterContainer/mainPageFilterContainer";
import { ProjectDetail } from "@/types/projectCatalog";
import { Map } from "@/types/map";

interface MainPageProjectsProps {
    initialProjects?: ProjectDetail[];
    mapData?: Map[];
    /** Show filter at top (for /project page where filter needs ProjectsProvider) */
    showFilter?: boolean;
}

export default function MainPageProjects({ 
    initialProjects, 
    mapData,
    showFilter = false 
}: MainPageProjectsProps = {}) {
    // Убеждаемся, что данные это массивы
    const safeInitialProjects = Array.isArray(initialProjects) ? initialProjects : [];
    const safeMapData = Array.isArray(mapData) ? mapData : [];
    
    return (
        <ProjectsProvider initialProjects={safeInitialProjects}>
            {showFilter && (
                <div className="mt-[68px]">
                    <MainPageFilterContainer />
                </div>
            )}
            <MainPageProjectsClient 
                mainPageProjects={safeInitialProjects} 
                mapData={safeMapData} 
            />
        </ProjectsProvider>
    );
}