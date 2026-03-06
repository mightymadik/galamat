"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { ProjectDetail } from "@/types/projectCatalog";

interface ProjectsContextType {
  projects: ProjectDetail[];
  setProjects: (projects: ProjectDetail[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  totalProjects: number;
  setTotalProjects: (count: number) => void;
  hasFiltered: boolean;
  setHasFiltered: (hasFiltered: boolean) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ 
  children,
  initialProjects 
}: { 
  children: ReactNode;
  initialProjects: ProjectDetail[];
}) {
  // Убеждаемся, что initialProjects это массив
  const safeInitialProjects = Array.isArray(initialProjects) ? initialProjects : [];
  
  const [projects, setProjects] = useState<ProjectDetail[]>(safeInitialProjects);
  const [isLoading, setIsLoading] = useState(false);
  const [totalProjects, setTotalProjects] = useState(safeInitialProjects.length);
  const [hasFiltered, setHasFiltered] = useState(false);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        setProjects,
        isLoading,
        setIsLoading,
        totalProjects,
        setTotalProjects,
        hasFiltered,
        setHasFiltered,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}
