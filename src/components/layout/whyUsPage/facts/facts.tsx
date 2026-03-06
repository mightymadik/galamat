import FactsClient from "./factsClient";
import FactsServer from "./factsServer";

export default async function WhyUsHero() {
    const data = await FactsServer();

    if (!data) return null;
    
    return <FactsClient factData={data} />;
}