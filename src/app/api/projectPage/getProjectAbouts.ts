import { apiGet } from "@/app/api/fetcher";
import { ProjectAboutDataItem, ProjectAboutSmall, ProjectAboutLarge } from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getProjectAbouts(projectSlug?: string) {
    const params: Record<string, string> = {
        "populate[complexAbout][populate][complexAboutItems][populate][complexAboutItemsLarge][populate]": "*",
        "populate[complexAbout][populate][complexAboutItems][populate][complexAboutItemsSmall][populate]": "*",
    };

    if (projectSlug) {
        params["filters[$and][0][projectSlug][$eq]"] = projectSlug;
    }

    const res = await apiGet({
        path: "/api/complexes",
        params,
    });

    if (!Array.isArray(res?.data)) return [];

    return res.data.map((item: any) => {
        const about = item.complexAbout;

        if (!about) return null;

        const smallItems: ProjectAboutSmall[] = [];
        const largeItems: ProjectAboutLarge[] = [];

        about.complexAboutItems.forEach((aboutItem: any) => {
            if (aboutItem.complexAboutItemsLarge) {
                largeItems.push({
                    id: aboutItem.complexAboutItemsLarge.id,
                    complexAboutItemsLargeTitle: aboutItem.complexAboutItemsLarge.complexAboutItemsLargeTitle,
                    complexAboutItemsLargeImage: BACKEND_URL + aboutItem.complexAboutItemsLarge.complexAboutItemsLargeImage.url,
                });
            }

            if (aboutItem.complexAboutItemsSmall?.length) {
                aboutItem.complexAboutItemsSmall.forEach((small: any) => {
                    smallItems.push({
                        id: small.id,
                        complexAboutItemsSmallTitle: small.complexAboutItemsSmallTitle,
                        complexAboutItemsSmallImage: BACKEND_URL + small.complexAboutItemsSmallImage.url,
                    });
                });
            }
        });

        return {
            id: about.id,
            complexAboutTitle: about.complexAboutTitle,
            complexAboutSubtitle: about.complexAboutSubtitle,
            complexAboutItemsSmall: smallItems,
            complexAboutItemsLarge: largeItems,
        };
    }).filter(Boolean) as ProjectAboutDataItem[];
}

export { getProjectAbouts as getProjectAbout }