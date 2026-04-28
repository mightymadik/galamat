import WhyUsHero from "@/components/layout/whyUsPage/hero/hero"
import WhyUsAbout from "@/components/layout/whyUsPage/about/about"
import WhyUsFacts from "@/components/layout/whyUsPage/facts/facts"
import WhyUsBuild from "@/components/layout/whyUsPage/build/build"
import WhyUsInfra from "@/components/layout/whyUsPage/infra/infra"
import WhyUsHistory from "@/components/layout/whyUsPage/history/history"
import WhyUsReview from "@/components/layout/whyUsPage/review/review"
import WhyUsMap from "@/components/layout/whyUsPage/map/map"
import OtherProjects from "@/components/layout/projectPage/otherProjects/otherProjects"
import MainPageProjectsWrapper from "@/components/layout/mainPage/projects/MainPageProjects/mainPageProjectsWrapper";
import WhyUsNumbers from "@/components/layout/whyUsPage/numbers/numbers";
import WhyUsForm from "@/components/layout/whyUsPage/form/form";
import WhyUsTeam from "@/components/layout/whyUsPage/team/team";
import WhyUsConditions from "@/components/layout/whyUsPage/conditions/conditions";
import WhyUsStages from "@/components/layout/whyUsPage/stages/stages";
import WhyUsVacancies from "@/components/layout/whyUsPage/vacancies/vacancies";

export const metadata = {
  title: "Почему мы — Galamat",
  description:
    "Galamat — Мы соединяем архитектуру, инженерные решения и городскую логику, формируя город, в котором растут дети, взрослеют поколения и сохраняется уверенность в завтрашнем дне..",
}

export default async function WhyUs() {
    return (
        <div className="mt-[68px] max-lg:mb-[50px]">
            <WhyUsHero />
            <WhyUsNumbers />
            <WhyUsForm />
            <WhyUsTeam />
            <WhyUsConditions />
            <WhyUsStages />
            <WhyUsVacancies />
            {/* <WhyUsAbout />
            <WhyUsFacts />
            <WhyUsBuild />
            <WhyUsInfra />
            <WhyUsHistory />
            <WhyUsReview />
            <WhyUsMap />
            <OtherProjects /> 
            <MainPageProjectsWrapper /> */}
        </div>
    )
}