"use server";

import { apiGet } from "@/app/api/fetcher";
import { WhyUsOfficeItemData } from "@/types/whyUsPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getOffice(): Promise<WhyUsOfficeItemData[]> {
  try {
    const res = await apiGet("/api/whyus-offices/?populate=*");
    if (!res?.data?.length) return [];

    const root = res.data[0];

    const officeImages =
      root.officeImages?.map((img: any) => {
        const formats = img.formats || {};
        const url =
          formats.large?.url ||
          formats.medium?.url ||
          formats.small?.url ||
          img.url;

        return `${BACKEND_URL}${url}`;
      }) ?? [];

    return [
      {
        id: root.id,
        officeTitle: root.officeTitle,
        officeMap: root.officeMap,
        officeImages,
      },
    ];
  } catch (e) {
    console.error("office fetch error", e);
    return [];
  }
}

export { getOffice as getWhyUsOffice };