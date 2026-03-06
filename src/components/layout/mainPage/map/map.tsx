import MapClient from "./mapClient";
import MapServer from "./mapServer";
import type { Map } from "@/types/map";

export default async function Map() {
    const data: Map[] = await MapServer();

    if (!data || data.length === 0) {
        return <MapClient mapData={[]} />;
    }
    
    return <MapClient mapData={data} />;
}