import NumbersClient from "./numbersClient";
import NumbersServer from "./numbersServer";

export default async function WhyUsNumbers() {
  const data = await NumbersServer();
  return <NumbersClient data={data} />;
}