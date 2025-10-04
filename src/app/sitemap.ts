import { SITE_URL } from "@/utils/consts";
import { headers } from "next/headers";

export default async function sitemap() {
  const headersList = await headers();
  const host = await headersList.get("host");
  const proto = await headersList.get("x-forwarded-proto");

  const res: any = Object.values(SITE_URL)
    .filter(
      (url) =>
        !url.includes("admin") &&
        !url.includes("home") &&
        !url.includes("company"),
    )
    .map((post: any) => {
      return {
        url: `${proto}://${host}${post}`,
        changeFrequency: "weekly",
        priority: 1,
      };
    });

  return res;
}
