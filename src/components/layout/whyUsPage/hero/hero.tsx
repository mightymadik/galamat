import HeroClient from "./heroClient";
import HeroServer from "./heroServer";

export default async function WhyUsHero() {
    const data = await HeroServer();

    if (!data) return null;
    
    return <HeroClient heroData={data} />;
}