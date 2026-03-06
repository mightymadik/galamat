import AboutClient from "./aboutClient";
import AboutServer from "./aboutServer";

export default async function WhyUsAbout() {
    const data = await AboutServer();

    if (!data || data.length === 0) {
        return <AboutClient aboutData={[]} />;
    }
    
    return <AboutClient aboutData={data} />;
}