import TeamClient from "./teamClient";
import TeamServer from "./teamServer";

export default async function WhyUsTeam() {
  const data = await TeamServer();
  return <TeamClient data={data} />;
}