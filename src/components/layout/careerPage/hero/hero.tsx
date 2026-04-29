import CareerHeroClient from "./heroClient";
import CareerHeroServer from "./heroServer";

export default async function CareerHero() {
  const data = await CareerHeroServer();
  return <CareerHeroClient data={data} />;
}