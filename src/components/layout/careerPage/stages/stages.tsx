import StagesClient from "./stagesClient";
import StagesServer from "./stagesServer";

export default async function CareerStages() {
  const data = await StagesServer();
  return <StagesClient data={data} />;
}