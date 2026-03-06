"use server";
import { apiGet } from "@/app/api/fetcher";
import { ExpectApartmentsData } from "@/types/mainPage";

const BACKEND_URL = process.env.STRAPI_URL;

export async function getExpectFlats(): Promise<ExpectApartmentsData[]> {
  try {
    const res = await apiGet(
      "/api/expect-flats/?populate[expectFlatsItems][populate]=expectFlatItemImage"
    );

    const root = res.data?.[0];
    if (!root) throw new Error("Service Unavailable");

    const items = root.expectFlatsItems || [];

    return items.map((item: any) => {
      const image = item.expectFlatItemImage;

      const relativeUrl =
        image?.formats?.large?.url ||
        image?.formats?.medium?.url ||
        image?.formats?.small?.url ||
        image?.url ||
        null;

      return {
        id: item.id,
        expectFlatTitle: root.expectFlatTitle,
        expectApartmentsTitle: item.expectFlatItemTitle,
        bg: relativeUrl ? `${BACKEND_URL}${relativeUrl}` : null,
      };
    });
  } catch (e) {
    console.error("Error fetching expect apartments:", e);
    throw new Error("Service Unavailable");
  }
}