import { apiGet } from "@/app/api/fetcher";
import { ProjectHeroDataItem } from "@/types/projectPage";

const BACKEND_URL = process.env.STRAPI_URL!;

export async function getProjectHeroes(projectSlug?: string): Promise<ProjectHeroDataItem[]> {
  const params: Record<string, string> = {
    "fields[0]": "complexName",
    "fields[1]": "complexAddress",
    "populate[complexHero][populate][complexHeroImage]": "true",
    "populate[complexHero][populate][complexHeroVideo]": "true",
    "populate[complexHero][populate][complexHeroBadges]": "true",
    "populate[complexHero][populate][complexHeroPrimaryPromo][populate]": "*",
    "populate[complexHero][populate][complexHeroSecondaryPromo][populate]": "*",
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
    const hero = item.complexHero ?? {};
    const primary = hero.complexHeroPrimaryPromo ?? {};
    const secondary = hero.complexHeroSecondaryPromo ?? {};

    return {
      id: item.documentId,
      complexName: item.complexName,
      complexAddress: item.complexAddress,

      complexHeroImage: hero.complexHeroImage?.url
        ? `${BACKEND_URL}${hero.complexHeroImage.url}`
        : "",
      complexHeroVideo: hero.complexHeroVideo?.url
      ? `${BACKEND_URL}${hero.complexHeroVideo.url}`
        : "",

      complexHeroBooklet: hero.complexHeroBooklet,

      complexHeroBadge:
        hero.complexHeroBadges?.map((b: any) => b.complexHeroBadge) ?? [],

      saleStart: primary.saleStart ?? false,
      complexHeroPrimaryPromoDate: primary.complexHeroPrimaryPromoDate ?? "",
      complexHeroPrimaryPromoTitle: primary.complexHeroPrimaryPromoTitle ?? "",
      complexHeroPrimaryPromoSubtitle: primary.complexHeroPrimaryPromoSubtitle ?? "",
      complexHeroPrimaryPromoIcon: primary.complexHeroPrimaryPromoIcon?.url
        ? `${BACKEND_URL}${primary.complexHeroPrimaryPromoIcon.url}`
        : "",

      complexHeroSecondaryPromoTitle:
        secondary.complexHeroPrimaryPromoTitle ?? "",
      complexHeroSecondaryPromoSubtitle:
        secondary.complexHeroPrimaryPromoSubtitle ?? "",
      complexHeroSecondaryPromoIcon: secondary.complexHeroPrimaryPromoIcon?.url
        ? `${BACKEND_URL}${secondary.complexHeroPrimaryPromoIcon.url}`
        : "",
    };
  });
}

export { getProjectHeroes as getProjectHero }