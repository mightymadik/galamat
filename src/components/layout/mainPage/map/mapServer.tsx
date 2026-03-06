import { getMapData } from "@/app/api/map/map";
import { Map } from "@/types/map";

export default async function MapServer(): Promise<Map[]> {
  const data = await getMapData();

  return data;
}