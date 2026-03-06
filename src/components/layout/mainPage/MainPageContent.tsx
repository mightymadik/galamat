"use client";
import { ProjectsProvider } from "@/contexts/ProjectsContext";
import { ProjectDetail } from "@/types/projectCatalog";
import { Map } from "@/types/map";
import MainPageFilterContainer from "./mainPageFilter/MainPageFilterContainer/mainPageFilterContainer";
import MainPageProjectsClient from "./projects/MainPageProjects/mainPageProjectsClient";

export default function MainPageContent({ 
  initialProjects,
  mapData
}: { 
  initialProjects: ProjectDetail[];
  mapData: Map[];
}) {
  // Убеждаемся, что initialProjects это массив
  const safeInitialProjects = Array.isArray(initialProjects) ? initialProjects : [];
  
  // Убеждаемся, что провайдер всегда рендерится
  if (!safeInitialProjects) {
    console.warn("MainPageContent: initialProjects is not an array");
  }
  
  return (
    <ProjectsProvider initialProjects={safeInitialProjects}>
      <MainPageFilterContainer />
      <MainPageProjectsClient mainPageProjects={safeInitialProjects} mapData={mapData} />
    </ProjectsProvider>
  );
}
