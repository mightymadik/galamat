import MainPageProjectsWrapper from "@/components/layout/mainPage/projects/MainPageProjects/mainPageProjectsWrapper";

export const metadata = {
  title: "Проекты - Galamat",
  description:
    "Galamat — надёжная проекты недвижимости в столице.",
}

export default async function Project() {
  return <MainPageProjectsWrapper />;
}