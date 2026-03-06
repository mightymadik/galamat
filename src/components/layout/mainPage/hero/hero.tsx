import HeroClient from "./heroClient";
import { HeroServer } from "./heroServer";

export default async function Hero() {
  try {
  const data = await HeroServer();
  return <HeroClient heroData={data} />;
  } catch (error) {
    throw error;
  }
}