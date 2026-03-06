import HistoryClient from "./historyClient";
import HistoryServer from "./historyServer";

export default async function WhuUsHistory() {
    const data = await HistoryServer();

    if (!data) return null;
    
    return <HistoryClient historyData={data} />;
}