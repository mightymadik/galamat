import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://galamat.kz",
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
