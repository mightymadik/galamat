import AdBannerClient from "./adBannerClient";
import { fetchAdData } from "./adBannerServer";

export default async function AdBanner() {
  const adData = await fetchAdData();

  if (!adData) return null;

  return <AdBannerClient adData={adData} />;
}
