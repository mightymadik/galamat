import axios from "axios";

export function getStrapiBaseUrl() {
  const url = process.env.STRAPI_URL;
  if (!url) throw new Error("STRAPI_URL missing");
  return url.replace(/\/$/, "");
}

export function getStrapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token) throw new Error("STRAPI_API_TOKEN missing");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const strapiAxios = axios.create({
  timeout: 15000,
});
