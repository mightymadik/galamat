import InfraClient from "./infraClient";
import InfraServer from "./infraServer";

export default async function WhyUsInfra() {
    const data = await InfraServer();

    if (!data) return null;
    
    return <InfraClient infraData={data} />;
}