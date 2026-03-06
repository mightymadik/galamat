import MapClient from "./mapClient";
import MapServer from "./mapServer";

export default async function WhyUsMap() {
    const data = await MapServer();

    if (!data) return null;
    
    return <MapClient officeData={data} />;
}