import { notFound } from 'next/navigation';
import HeroSection from "@/components/layout/projectPage/heroSection/heroSection"
import AboutProject from "@/components/layout/projectPage/aboutProject/aboutProject"
import GenPlan from "@/components/layout/projectPage/genPlan/genPlan"
import Plans from "@/components/layout/projectPage/plans/plans"
import Features from "@/components/layout/projectPage/features/features"
import ServicesProject from "@/components/layout/projectPage/servicesProject/servicesProject"
import MapOffices from "@/components/layout/projectPage/mapOffices/mapOffices"
import OtherProjects from "@/components/layout/projectPage/otherProjects/otherProjects";
import News from "@/components/layout/mainPage/news/news";
import ProjectPageFlatsFilter from "@/components/layout/projectPage/projectPageFlatsFilter/projectPageFlatsFilter";

import {
    getProjectHeroes,
    getProjectAbouts,
    getProjectGenPlans,
    getProjectPlans,
    getProjectFeatures,
    getProjectServices
} from "@/features/projectPage/getProjectPage";
import { getProjectsDetails } from '@/features/projectCatalog/getProjectCatalog';
import {
    ProjectHeroDataItem,
    ProjectAboutDataItem,
    ProjectGenPlanDataItem,
    ProjectPlansDataItem,
    ProjectFeaturesDataItem,
    ProjectServicesDataItem
} from "@/types/projectPage";
import { ProjectDetail } from "@/types/projectCatalog";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
    const { name } = await params;

    const projectHero = await fetchHeroData(name);
    const projectAbout = await fetchAboutData(name);

    return {
        title: projectHero?.complexName,
        description: projectAbout?.complexAboutSubtitle,
        openGraph: {
            title: projectHero?.complexName,
            description: projectAbout?.complexAboutSubtitle,
            images: projectHero?.complexHeroImage ? [projectHero.complexHeroImage] : [],
        },
    };
}

export default async function Page({ params }: { params: { name: string }; }) {
    const { name } = await params;

    const [
        projectHero,
        projectAbout,
        projectGenPlan,
        projectPlans,
        projectFeatures,
        projectServices,
        projectOthers
    ] = await Promise.all([
        fetchHeroData(name),
        fetchAboutData(name),
        fetchGenPlanData(name),
        fetchPlansData(name),
        fetchFeaturesData(name),
        fetchServicesData(name),
        fetchOthersData(name)
    ]);

    if (!projectHero) {
        notFound();
    }

    return (
        <>
            <div className="mt-[68px]">
                <HeroSection projectSlug={projectHero} />
            </div>
            <div className="py-[0px] lg:py-[64px]">
                <ProjectPageFlatsFilter initialProject={projectHero.complexName?.trim()} />
            </div>
            <AboutProject projectSlug={projectAbout ?? undefined} />
            <GenPlan projectSlug={projectGenPlan ?? undefined} />
            {/* <Hypothec /> */}
            <Plans projectSlug={projectPlans ?? undefined} />
            <Features projectSlug={projectFeatures} />
            <ServicesProject projectSlug={projectServices ?? undefined} />
            <MapOffices />
            <News />
            <OtherProjects otherProjectsData={projectOthers ?? undefined} />
        </>
    )
}

async function fetchHeroData(slug: string): Promise<ProjectHeroDataItem | null> {
    try {
        const data = await getProjectHeroes(slug);
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error(`Error fetching hero data for ${slug}:`, error);
        return null;
    }
}

async function fetchAboutData(slug: string): Promise<ProjectAboutDataItem | null> {
    try {
        const data = await getProjectAbouts(slug);
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error(`Error fetching about data for ${slug}:`, error);
        return null;
    }
}

async function fetchGenPlanData(slug: string): Promise<ProjectGenPlanDataItem | null> {
    try {
        const data = await getProjectGenPlans(slug);
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error(`Error fetching gen plan data for ${slug}:`, error);
        return null;
    }
}

async function fetchPlansData(slug: string): Promise<ProjectPlansDataItem[]> {
    try {
        const data = await getProjectPlans(slug);
        return data ?? [];
    } catch (error) {
        console.error(`Error fetching plans data for ${slug}:`, error);
        throw new Error("Service Unavailable");
    }
}

async function fetchFeaturesData(slug: string): Promise<ProjectFeaturesDataItem[]> {
    try {
        const data = await getProjectFeatures(slug);
        return data ?? [];
    } catch (error) {
        console.error(`Error fetching features data for ${slug}:`, error);
        throw new Error("Service Unavailable");
    }
}

async function fetchServicesData(slug: string): Promise<ProjectServicesDataItem[] | null> {
    try {
        const data = await getProjectServices(slug);
        return data ?? [];
    } catch (error) {
        console.error(`Error fetching services data for ${slug}:`, error);
        throw new Error("Service Unavailable");
    }
}

async function fetchOthersData(slug: string): Promise<ProjectDetail[] | null> {
    try {
        const data = await getProjectsDetails();
        const others = data ? data.filter(project => project.projectSlug !== slug) : [];
        return others ?? [];
    } catch (error) {
        return null;
    }
}