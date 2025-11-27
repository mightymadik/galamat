"use client";
import Image from "next/image";
import { useSelector } from "react-redux";

export default function About() {
  const selectedLang = useSelector(
    (state: any) => state.translateSite.selectedLang,
  );

  // Russian texts
  const russianTexts = {
    aboutProject: "О проекте",
    cosmicComfort: "Космический комфорт",
    description:
      "ЖК Galaxy Star — это пространство, где вдохновляющая атмосфера космоса встречается с динамикой современной столицы. На левом берегу, в окружении развитой инфраструктуры, создаётся комфортная среда для жизни: стильная архитектура, продуманные планировки, удобные дворы и современные технологии. Здесь каждый день ощущается по-новому — словно вы живёте на собственной орбите, среди энергии города и уюта, который наполняет дом.",
    mallText: "Собственный парк, всего в двух шагах от ЖК ",
    designerHall: "Авторский дизайнерский холл",
    schoolText: "Комфортная школа всего в 2 минутах",
    secureCourtyard: "Закрытый безопасный двор",
    smartTech: "Smart замки, Face ID",
    transportText:
      "На аллее установлены зарядные станции для электромобилей, а так же бесплатный интернет Starlink",
    facilitiesText:
      "2 комфортные школы, Binom school, государственные детские сады, поликлиника",
    safetyText:
      "Закрытый двор обеспечивает безопасность для ваших близких, перекрывая доступ к машинам",
  };

  // Kazakh texts
  const kazakhTexts = {
    aboutProject: "Жоба туралы",
    cosmicComfort: "Ғарыштық жайлылық",
    description:
      "Galaxy Star тұрғын үй кешені — бұл космосқа тән шабыттандыратын атмосфера мен заманауи астананың динамикасы тоғысқан кеңістік. Сол жақ жағалауда, дамыған инфрақұрылымның ортасында жайлы өмір сүруге арналған қолайлы орта жасалған: стильді архитектура, ойлана жобаланған жоспарлар, ыңғайлы аулалар мен заманауи технологиялар. Мұнда әр күн ерекше сезіледі — өз орбитанызда өмір сүріп жатқандай, қала энергиясы мен үйдің жылулығы үйлесім табады.",
    mallText: "Тұрғын үй кешені екі қадам жерде жеке меншік саябақ орналасқан ",
    designerHall: "Авторлық дизайнерлік холл",
    schoolText: "Жайлы мектеп небәрі 2 минуттық жерде",
    secureCourtyard: "Жабық қауіпсіз аула",
    smartTech: "Smart құлыптар, Face ID",
    transportText:
      "Саябақта электромобильдерге арналған қуаттау станциялары және тегін Starlink интернеті орнатылған ",
    facilitiesText:
      " Жайлы мектептер, мемлекеттік балабақшалар, емхана қасында ",
    safetyText:
      "Жабық аула көліктердің кіреберісін жабу арқылы жақындарыңыздың қауіпсіздігін қамтамасыз етеді",
  };

  // Function to get texts based on language with if-else logic
  const getTexts = () => {
    if (selectedLang === "kz") {
      return kazakhTexts;
    } else {
      return russianTexts;
    }
  };

  const texts = getTexts();

  return (
    <>
      <div className="py-[40px] lg:py-[64px]">
        <div className="wrapper flex justify-center items-start gap-[32px] self-stretch flex-col lg:flex-row">
          <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
            <span className="text-[#8B8DA5] text-[36px] not-italic font-medium leading-[100%]">
              {texts.aboutProject}
            </span>
            <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[100%]">
              {texts.cosmicComfort}
            </h1>
          </div>
          <p className="flex-[1_0_0] text-[16px] not-italic font-regular leading-[23px]">
            {texts.description}
          </p>
        </div>
      </div>
      <div className="py-![40px] lg:py-![64px]">
        <div className="wrapper flex flex-col items-start gap-[32px] self-stretch">
          <div className="flex items-center gap-[32px] self-stretch flex-col lg:flex-row">
            <div className="w-full min-h-[300px] lg:min-h-[100px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/4.jpg')] bg-cover bg-center">
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                  {texts.mallText}
                </h1>
              </div>
            </div>
            <div className="flex flex-row gap-[8px] lg:gap-[32px] w-full lg:max-w-[630px] h-full lg:h-[300px]">
              <div className="flex w-full max-w-full lg:max-w-[300px] p-[16px] lg:p-[32px] flex-col items-start gap-[24px] rounded-[32px] bg-[#F4F6FB]">
                <Image
                  src="/img/design.svg"
                  alt="Design"
                  width={58}
                  height={58}
                />
                <span className="flex flex-col justify-end flex-[1_0_0] self-stretch text-[#363744] [font-size:_clamp(14px,2vw,20px)] not-italic font-medium leading-[100%]">
                  {texts.designerHall}
                </span>
              </div>
              <div className="flex w-full max-w-full lg:max-w-[300px] p-[16px] lg:p-[32px] flex-col items-start gap-[24px] rounded-[32px] bg-[#F4F6FB]">
                <Image
                  src="/img/school.svg"
                  alt="School"
                  width={58}
                  height={58}
                />
                <span className="flex flex-col justify-end flex-[1_0_0] self-stretch text-[#363744] [font-size:_clamp(14px,2vw,20px)] not-italic font-medium leading-[100%]">
                  {texts.schoolText}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-[32px] self-stretch flex-col-reverse lg:flex-row">
            <div className="flex flex-row gap-[8px] lg:gap-[32px] w-full lg:max-w-[630px] h-full lg:h-[300px]">
              <div className="flex w-full max-w-full lg:max-w-[300px] p-[16px] lg:p-[32px] flex-col items-start gap-[24px] rounded-[32px] bg-[#F4F6FB]">
                <Image
                  src="/img/security.svg"
                  alt="Security"
                  width={58}
                  height={58}
                />
                <span className="flex flex-col justify-end flex-[1_0_0] self-stretch text-[#363744] [font-size:_clamp(14px,2vw,20px)] not-italic font-medium leading-[100%]">
                  {texts.secureCourtyard}
                </span>
              </div>
              <div className="flex w-full max-w-full lg:max-w-[300px] p-[16px] lg:p-[32px] flex-col items-start gap-[24px] rounded-[32px] bg-[#F4F6FB]">
                <Image src="/img/eye.svg" alt="Eye" width={58} height={58} />
                <span className="flex flex-col justify-end flex-[1_0_0] self-stretch text-[#363744] [font-size:_clamp(14px,2vw,20px)] not-italic font-medium leading-[100%]">
                  {texts.smartTech}
                </span>
              </div>
            </div>
            <div className="w-full min-h-[300px] lg:min-h-[100px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/1.jpg')] bg-cover bg-center">
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch"></div>
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                  {texts.transportText}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-[8px] lg:gap-[32px] self-stretch flex-col lg:flex-row">
            <div className="w-full min-h-[300px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/school.jpg')] bg-cover bg-center">
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch"></div>
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                  {texts.facilitiesText}
                </h1>
              </div>
            </div>
            <div className="w-full min-h-[300px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/4n.jpg')] bg-cover bg-center">
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch"></div>
              <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                  {texts.safetyText}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
