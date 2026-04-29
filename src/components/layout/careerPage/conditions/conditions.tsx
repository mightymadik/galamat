import ConditionsClient from "./conditionsClient";
import ConditionsServer from "./conditionsServer";

export default async function CareerConditions() {
  const data = await ConditionsServer();
  return <ConditionsClient data={data} />;
}