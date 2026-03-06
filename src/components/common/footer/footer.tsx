import { getFooter } from "@/app/api/footer/getFooter";
import { getMainPageSocialMedia } from "@/features/mainPage/getMainPage";
import { getAvailableProjects } from "@/app/api/footer/getAvailableProjects";
import FooterClient from "./footerClient";

export default async function Footer() {
  const data = await getFooter();
  const socialMedia = await getMainPageSocialMedia();
  const availableProjects = await getAvailableProjects();
  if (!data) return null;

  return <FooterClient data={data} socialMedia={socialMedia} availableProjects={availableProjects ?? []} />;
}