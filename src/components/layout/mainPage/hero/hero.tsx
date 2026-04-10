import HeroClient from "./heroClient";
import { HeroServer } from "./heroServer";

export default async function Hero() {
  const data = await HeroServer();
  return <HeroClient heroData={data} />;
}