import BuildClient from "./buildClient";
import BuildServer from "./buildServer";

export default async function WhyUsBuild() {
    const data = await BuildServer();

    if (!data) return null;
    
    return <BuildClient buildData={data} />;
}