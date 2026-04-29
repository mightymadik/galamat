import CareerHero from "@/components/layout/careerPage/hero/hero";
import CareerNumbers from "@/components/layout/careerPage/numbers/numbers";
import CareerForm from "@/components/layout/careerPage/form/form";
import CareerTeam from "@/components/layout/careerPage/team/team";
import CareerConditions from "@/components/layout/careerPage/conditions/conditions";
import CareerStages from "@/components/layout/careerPage/stages/stages";
import CareerVacancies from "@/components/layout/careerPage/vacancies/vacancies";

export const metadata = {
  title: "Карьера — Galamat",
  description:
    "Присоединяйтесь к команде Galamat: архитектура, инженерия и городская среда. Отправьте резюме и знакомьтесь с условиями работы.",
};

export default async function CareerPage() {
  return (
    <div className="mt-[68px] max-lg:mb-[50px]">
      <CareerHero />
      <CareerNumbers />
      <CareerForm />
      <CareerTeam />
      <CareerConditions />
      <CareerStages />
      <CareerVacancies />
    </div>
  );
}
