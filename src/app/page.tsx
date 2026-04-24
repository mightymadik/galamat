"use server";
import Hero from "@/components/layout/mainPage/hero/hero";
import MainPageContent from "@/components/layout/mainPage/MainPageContent";
import LeaveRequest from "@/components/layout/mainPage/leaveRequest/leaveRequest";
import AdBanner from "@/components/layout/mainPage/adBanner/adBanner";
import Services from "@/components/layout/mainPage/services/services";
import ExpectApartments from "@/components/layout/mainPage/expectApartments/expectApartments";
import News from "@/components/layout/mainPage/news/news";
import MainPageProjectsServer from "@/components/layout/mainPage/projects/MainPageProjects/mainPageProjectsServer";

export default async function Page() {
  const { projects, map } = await MainPageProjectsServer();
  
  return (
    <>
      <Hero />
      <MainPageContent initialProjects={projects || []} mapData={map || []} />
      <LeaveRequest />
      <AdBanner />
      <Services />
      <ExpectApartments />
      <News />
    </>
  );
}