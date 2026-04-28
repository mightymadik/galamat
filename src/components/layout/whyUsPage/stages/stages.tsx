import StagesClient from "./stagesClient";
import StagesServer from "./stagesServer";

export default async function WhyUsStages() {
  const data = await StagesServer();
  return <StagesClient data={data} />;
}