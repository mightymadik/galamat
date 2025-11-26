"use client";
import { useSelector } from "react-redux";

export default function Infrastructure() {
  const selectedLang = useSelector(
    (state: any) => state.translateSite.selectedLang,
  );

  // Russian texts
  const russianTexts = {
    infrastructureTitle: "Инфраструктура",
    infrastructureSubtitle: "В шаговой доступности",
    infrastructureDescription:
      "Galaxy Star расположен в стремительно развивающемся районе левого берега — всего в 10 минутах от крупнейшего торгово-развлекательного центра столицы, Ellington Mall. Главное преимущество локации — удобная транспортная доступность: жители могут легко миновать городские пробки и быстро добираться как до левого, так и до правого берега.",
    education: "Государственные детские сады и 3 школы",
    mall: "Крупный ТРЦ Elington Mall",
    alley: "Парк в шаговой доступности",
    courtyardTitle: "Внутренний двор",
    courtyardSubtitle: "Безопасность",
    courtyardDescription:
      "Почувствуйте атмосферу жизни во дворе Galaxy Star\nНа большом футбольном поле кипят эмоции, на современной детской площадке играют дети всех возрастов, вдоль аллей проложены велодорожки, а в зоне отдыха жители проводят время на уютных скамейках. Рядом — просторная воркаут-площадка и тихие зелёные уголки для чтения и спокойных разговоров.\nВо дворе Galaxy Star каждый найдёт своё пространство — динамичное, комфортное и вдохновляющее.",
    restArea: "Зона отдыха",
    playground: "Детские площадки и футбольное поле",
    architectureTitle: "Архитектура",
    architectureSubtitle: "Стиль нового времени",
    architectureDescription:
      "Тёплая кирпичная фактура домов Galaxy Star создаёт ощущение надёжности и уюта с первого взгляда. Фасады выполнены в современном вентфасаде из композитной панели — материал, который сочетает прочность, долговечность и выразительную эстетику. Контрастные оттенки панелей придают зданиям динамику и подчёркивают космическую концепцию проекта.",
    brickHouse: "Кирпичный дом",
    brickHouseDesc:
      "Тёплый кирпичный дом обеспечивает уют, надёжность и комфорт",
    largeWindows: "Увеличенные окна",
    largeWindowsDesc:
      "Такие окна наполняют пространство светом и делают интерьер визуально просторнее.",
    ceilings: "Потолоки 3 метра",
    ceilingsDesc:
      "Высокие потолки - один из стандартов Galamat. 3 м дарят больше простора и воздуха.",
    facade: "Фасад",
    facadeDesc: "Долговечный вентилируемый фасад, композитная панель",
  };

  // Kazakh texts
  const kazakhTexts = {
    infrastructureTitle: "Инфрақұрылым",
    infrastructureSubtitle: "Жақын маңда",
    infrastructureDescription:
      "Galaxy Star сол жағалаудың қарқынды дамып келе жатқан ауданында орналасқан — елордадағы ең ірі сауда-ойын-сауық орталығы Ellington Mall-дан небәрі 10 минуттық жерде. Локацияның басты артықшылығы — ыңғайлы көлік қолжетімділігі: тұрғындар қалалық кептелістерді оңай айналып өтіп, сол жағалауға да, оң жағалауға да тез жете алады.",
    education: "Мемлекеттік балабақшалар мен 3 мектеп",
    mall: "Ең үлкен СОО Elington Mall",
    alley: "Тұрғын үй кешені қасында жайлы саябақ орналасқан",
    courtyardTitle: "Ішкі аула",
    courtyardSubtitle: "Қауіпсіздік",
    courtyardDescription:
      "Galaxy Star ауласындағы өмір атмосферасын сезініңіз. Үлкен футбол алаңында эмоциялар қайнап жатыр, заманауи ойын алаңында әр жастағы балалар ойнап жүр, саябақ бойымен веложолдар өтеді, ал демалыс аймағында тұрғындар жайлы орындықтарда уақыт өткізеді. Жанында — кең воркаут-аймағы және кітап оқуға немесе тыныш әңгімеге арналған жасыл тыныш аймақтар бар. Galaxy Star ауласында әр адам өзіне лайық кеңістікті табады — динамикалық, жайлы және шабыттандыратын.",
    restArea: "Демалыс аймағы",
    playground: "Балалар алаңдары мен футбол алаңы",
    architectureTitle: "Архитектура",
    architectureSubtitle: "Жаңа дәуір стилі",
    architectureDescription:
      "Galaxy Star үйлерінің жылы кірпіш текстурасы бірінші сәттен-ақ сенімділік пен жайлылық сезімін сыйлайды. Қасбеттер заманауи желдетілетін қасбет технологиясымен жасалған болат композиттік панельдерден тұрады — бұл беріктік, ұзақ мерзімділік және көркем эстетиканы үйлестіретін материал. Панельдердің контрастты түстері ғимараттарға динамика беріп, жобаның ғарыштық концепциясын айқындай түседі.",
    brickHouse: "Кірпіш үй",
    brickHouseDesc:
      "Жылы кірпіш үй алғашқы минуттан-ақ жайлылық, сенімділік және комфорт сыйлайды",
    largeWindows: "Үлкейтілген терезелер",
    largeWindowsDesc:
      "Үлкейтілген терезелер кеңістікті жарыққа толтырып, интерьерді көзге кеңірек көрсетеді.",
    ceilings: "Төбе биіктігі 3 метр",
    ceilingsDesc:
      "Биік төбелер Galamat стандарттарының бірі. 3 метр кеңістік пен ауа сезімін арттырады.",
    facade: "Қасбет",
    facadeDesc: "Төзімді желдетілетін қасбет, болат композиттік панель.",
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
    <div>
      <div className="py-[40px] lg:py-[64px]">
        <div className="wrapper flex justify-center items-start gap-[32px] self-stretch flex-col">
          <div className="flex gap-[32px] flex-col lg:flex-row">
            <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
              <span className="text-[#8B8DA5] text-[36px] not-italic font-medium leading-[100%]">
                {texts.infrastructureTitle}
              </span>
              <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[100%]">
                {texts.infrastructureSubtitle}
              </h1>
            </div>
            <p className="flex-[1_0_0] text-[16px] not-italic font-regular leading-[23px]">
              {texts.infrastructureDescription}
            </p>
          </div>
          <div className="flex w-full pt-0 lg:pt-[45px] overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-[8px] lg:gap-[32px] flex-row w-full">
              <div className="min-w-[400px] max-w-[528px] min-h-[300px] h-[451px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] rounded-[32px] bg-[url('/img/education.png')] bg-cover bg-center">
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start"></div>
                <div className="flex w-full pl-[20px] pr-[20px] py-[19.39px] flex-col items-start bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                  <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                    {texts.education}
                  </h1>
                </div>
              </div>
              <div className="min-w-[400px] max-w-[528px]  h-[451px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] rounded-[32px] bg-[url('/img/ellington.png')] bg-cover bg-center">
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start"></div>
                <div className="flex w-full pl-[20px] pr-[20px] py-[19.39px] flex-col items-start bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                  <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                    {texts.mall}
                  </h1>
                </div>
              </div>
              <div className="min-w-[400px] max-w-[528px]  h-[451px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] rounded-[32px] bg-[url('/img/6.jpg')] bg-cover bg-center">
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start"></div>
                <div className="flex w-full pl-[20px] pr-[20px] py-[19.39px] flex-col items-start bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                  <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                    {texts.alley}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="py-[40px] lg:py-[64px]">
        <div className="wrapper flex justify-center items-start gap-[32px] self-stretch flex-col">
          <div className="flex gap-[32px] flex-col lg:flex-row">
            <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
              <span className="text-[#8B8DA5] text-[36px] not-italic font-medium leading-[100%]">
                {texts.courtyardTitle}
              </span>
              <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[100%]">
                {texts.courtyardSubtitle}
              </h1>
            </div>
            <p className="flex-[1_0_0] text-[16px] not-italic font-regular leading-[23px]">
              {texts.courtyardDescription}
            </p>
          </div>
          <div className="flex w-full pt-0 lg:pt-[45px] overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-[8px] lg:gap-[32px] self-stretch flex-row w-full">
              <div className="min-w-[528px] h-[451px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/zone.jpg')] bg-cover bg-center">
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch"></div>
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                  <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                    {texts.restArea}
                  </h1>
                </div>
              </div>
              <div className="min-w-[528px] h-[451px] flex flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/field.jpg')] bg-cover bg-center">
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch"></div>
                <div className="flex pl-[20px] pr-[20px] py-[19.39px] flex-col items-start self-stretch bg-[linear-gradient(0deg,_var(--color-blue-1880,_rgba(37,_37,_56,_0.80))_44.23%,_var(--color-blue-180,_rgba(37,_37,_56,_0.00))_100%)] rounded-b-[32px]">
                  <h1 className="text-white [font-size:_clamp(16px,2vw,20px)] not-italic font-medium leading-[normal]">
                    {texts.playground}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="py-[40px] lg:py-[64px]">
        <div className="wrapper flex justify-center items-start gap-[32px] self-stretch flex-col">
          <div className="flex gap-[32px] flex-col lg:flex-row">
            <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
              <span className="text-[#8B8DA5] text-[36px] not-italic font-medium leading-[100%]">
                {texts.architectureTitle}
              </span>
              <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[100%]">
                {texts.architectureSubtitle}
              </h1>
            </div>
            <p className="flex-[1_0_0] text-[16px] not-italic font-regular leading-[23px]">
              {texts.architectureDescription}
            </p>
          </div>
          <div className="flex w-full h-[400px] p-[24px] flex-col justify-end items-center gap-[10px] rounded-[24px] bg-[url(/img/cam.png)] bg-cover bg-no-repeat"></div>

          <div className="pt-[18px] w-full pointer-events-none relative">
            <div className="adContainer flex w-full overflow-hidden pt-[24px] w-full relative">
              <div className="adItems grid grid-cols-auto lg:flex lg:grid-cols-1 w-full justify-end items-start gap-[32px] flex-[1_0_0]">
                <div className="flex items-start gap-[13.404px] w-full">
                  <div className="bg-[#F4F5F9] h-[92px] rounded-[24px] p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M25 14.9988V44.9988C25 48.4991 25 50.2493 24.3188 51.5862C23.7196 52.7622 22.7635 53.7184 21.5874 54.3176C20.2505 54.9988 18.5003 54.9988 15 54.9988C11.4997 54.9988 9.74951 54.9988 8.41256 54.3176C7.23655 53.7184 6.28042 52.7622 5.68121 51.5862C5 50.2493 5 48.4991 5 44.9988V14.9988C5 11.4985 5 9.74829 5.68121 8.41134C6.28042 7.23533 7.23655 6.2792 8.41256 5.67999C9.74951 4.99878 11.4997 4.99878 15 4.99878C18.5003 4.99878 20.2505 4.99878 21.5874 5.67999C22.7635 6.2792 23.7196 7.23533 24.3188 8.41134C25 9.74829 25 11.4985 25 14.9988ZM17.5 49.3738C18.5355 49.3738 19.375 48.5343 19.375 47.4988C19.375 46.4632 18.5355 45.6238 17.5 45.6238H12.5C11.4645 45.6238 10.625 46.4632 10.625 47.4988C10.625 48.5343 11.4645 49.3738 12.5 49.3738H17.5Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M47.6499 26.5348L33.0546 41.7587C31.23 43.6619 30.3177 44.6136 29.5338 44.2985C28.75 43.9835 28.75 42.6652 28.75 40.0286L28.75 19.4333C28.7529 17.7833 29.4082 16.2014 30.5728 15.0327L33.2096 12.3958L34.2853 11.5735C36.7958 9.65409 38.0511 8.69441 39.4183 8.39954C40.5437 8.15683 41.7143 8.22967 42.8009 8.61003C44.121 9.07213 45.2476 10.18 47.5008 12.3958C49.9997 14.8947 51.2492 16.1442 51.7124 17.5752C52.1075 18.7956 52.1175 20.1079 51.7411 21.3342C51.2997 22.772 50.0831 24.0263 47.6499 26.5348Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M31.9744 54.9988H44.7485C48.2489 54.9988 49.999 54.9988 51.336 54.3176C52.512 53.7184 53.4681 52.7622 54.0673 51.5862C54.7485 50.2493 54.7485 48.4991 54.7485 44.9988C54.7485 41.4985 54.7485 39.7483 54.0673 38.4113C53.4681 37.2353 52.512 36.2792 51.336 35.68C49.999 34.9988 48.2489 34.9988 44.7485 34.9988H44.1992L29.6951 49.4937C29.09 50.0985 28.75 50.8465 28.75 51.702C28.75 53.4827 30.1936 54.9988 31.9744 54.9988Z"
                        fill="#1D3D7E"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <p className="w-full text-[#122C5E] text-[20px] not-italic font-regular leading-[100%]">
                      {texts.brickHouse}
                    </p>
                    <p className="w-full text-[#122C5E] text-[16px] not-italic font-regular leading-[100%] opacity-70">
                      {texts.brickHouseDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-[13.404px] w-full">
                  <div className="bg-[#F4F5F9] h-[92px] rounded-[24px] p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                    >
                      <path
                        d="M5 27.5C5 18.0719 5 13.3579 7.92893 10.4289C10.8579 7.5 15.5719 7.5 25 7.5H35C44.4281 7.5 49.1421 7.5 52.0711 10.4289C55 13.3579 55 18.0719 55 27.5V32.5C55 41.9281 55 46.6421 52.0711 49.5711C49.1421 52.5 44.4281 52.5 35 52.5H25C15.5719 52.5 10.8579 52.5 7.92893 49.5711C5 46.6421 5 41.9281 5 32.5V27.5Z"
                        stroke="#1D3D7E"
                        strokeWidth="3"
                      />
                      <path
                        opacity="1"
                        d="M37.5 52.5L37.5 7.5"
                        stroke="#1D3D7E"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <p className="w-full text-[#122C5E] text-[20px] not-italic font-regular leading-[100%]">
                      {texts.largeWindows}
                    </p>
                    <p className="w-full text-[#122C5E] text-[16px] not-italic font-regular leading-[100%] opacity-70">
                      {texts.largeWindowsDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-[13.404px] w-full">
                  <div className="bg-[#F4F5F9] h-[92px] rounded-[24px] p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7.5 26.0441C7.5 18.0501 7.5 14.0531 8.44379 12.7085C9.38758 11.3638 13.1458 10.0773 20.6623 7.50442L22.0943 7.01423C26.0125 5.67304 27.9715 5.00244 30 5.00244C32.0285 5.00244 33.9875 5.67304 37.9057 7.01423L39.3377 7.50442C46.8542 10.0773 50.6124 11.3638 51.5562 12.7085C52.5 14.0531 52.5 18.0501 52.5 26.0441V29.9808C52.5 44.076 41.9026 50.9162 35.2536 53.8206C33.45 54.6085 32.5481 55.0024 30 55.0024C27.4518 55.0024 26.55 54.6085 24.7464 53.8206C18.0974 50.9162 7.5 44.076 7.5 29.9808V26.0441ZM35 22.5024C35 25.2639 32.7614 27.5024 30 27.5024C27.2386 27.5024 25 25.2639 25 22.5024C25 19.741 27.2386 17.5024 30 17.5024C32.7614 17.5024 35 19.741 35 22.5024ZM30 42.5024C40 42.5024 40 40.2639 40 37.5024C40 34.741 35.5228 32.5024 30 32.5024C24.4772 32.5024 20 34.741 20 37.5024C20 40.2639 20 42.5024 30 42.5024Z"
                        fill="#1D3D7E"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <p className="w-full text-[#122C5E] text-[20px] not-italic font-regular leading-[100%]">
                      {texts.ceilings}
                    </p>
                    <p className="w-full text-[#122C5E] text-[16px] not-italic font-regular leading-[100%] opacity-70">
                      {texts.ceilingsDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-[13.404px] w-full">
                  <div className="bg-[#F4F5F9] h-[92px] rounded-[24px] p-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="60"
                      height="60"
                      viewBox="0 0 60 60"
                      fill="none"
                    >
                      <path
                        d="M35 6.87744C39.7671 6.87744 43.1537 6.88143 45.7229 7.22684C48.2381 7.565 49.6872 8.19918 50.7453 9.2572C51.9631 10.475 52.4931 11.4191 52.7868 13.102C53.1178 14.9989 53.125 17.7047 53.125 22.5024C53.125 23.538 53.9645 24.3774 55 24.3774C56.0355 24.3774 56.875 23.538 56.875 22.5024L56.875 22.2617C56.8751 17.7637 56.8752 14.7167 56.481 12.4574C56.0424 9.94408 55.108 8.31664 53.3969 6.60555C51.526 4.73464 49.1536 3.90435 46.2226 3.51028C43.3745 3.12737 39.7355 3.1274 35.1411 3.12744H35C33.9645 3.12744 33.125 3.96691 33.125 5.00244C33.125 6.03798 33.9645 6.87744 35 6.87744Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M5.00001 35.6274C6.03555 35.6274 6.87501 36.4669 6.87501 37.5024C6.87501 42.3002 6.88222 45.006 7.21322 46.9029C7.50689 48.5858 8.03693 49.5298 9.25477 50.7477C10.3128 51.8057 11.7619 52.4399 14.2771 52.778C16.8463 53.1235 20.233 53.1274 25 53.1274C26.0355 53.1274 26.875 53.9669 26.875 55.0024C26.875 56.038 26.0355 56.8774 25 56.8774H24.859C20.2646 56.8775 16.6255 56.8775 13.7775 56.4946C10.8464 56.1005 8.47403 55.2702 6.60312 53.3993C4.89203 51.6882 3.95761 50.0608 3.51904 47.5475C3.12481 45.2882 3.12489 42.2412 3.125 37.7433L3.12501 37.5024C3.12501 36.4669 3.96448 35.6274 5.00001 35.6274Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M55 35.6274C56.0355 35.6274 56.875 36.4669 56.875 37.5024L56.875 37.7432C56.8751 42.2412 56.8752 45.2882 56.481 47.5475C56.0424 50.0608 55.108 51.6882 53.3969 53.3993C51.526 55.2702 49.1536 56.1005 46.2226 56.4946C43.3745 56.8775 39.7354 56.8775 35.141 56.8774H35C33.9645 56.8774 33.125 56.038 33.125 55.0024C33.125 53.9669 33.9645 53.1274 35 53.1274C39.7671 53.1274 43.1537 53.1235 45.7229 52.778C48.2381 52.4399 49.6872 51.8057 50.7453 50.7477C51.9631 49.5298 52.4931 48.5858 52.7868 46.9029C53.1178 45.006 53.125 42.3002 53.125 37.5024C53.125 36.4669 53.9645 35.6274 55 35.6274Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M24.859 3.12744H25C26.0355 3.12744 26.875 3.96691 26.875 5.00244C26.875 6.03798 26.0355 6.87744 25 6.87744C20.233 6.87744 16.8463 6.88143 14.2771 7.22684C11.7619 7.565 10.3128 8.19918 9.25477 9.2572C8.03693 10.475 7.50689 11.4191 7.21322 13.102C6.88222 14.9989 6.87501 17.7047 6.87501 22.5024C6.87501 23.538 6.03555 24.3774 5.00001 24.3774C3.96448 24.3774 3.12501 23.538 3.12501 22.5024L3.125 22.2617C3.12489 17.7638 3.12481 14.7167 3.51904 12.4574C3.95761 9.94408 4.89203 8.31664 6.60312 6.60555C8.47403 4.73464 10.8464 3.90435 13.7775 3.51028C16.6255 3.12737 20.2646 3.1274 24.859 3.12744Z"
                        fill="#1D3D7E"
                      />
                      <path
                        d="M30 26.8774C28.2741 26.8774 26.875 28.2766 26.875 30.0024C26.875 31.7283 28.2741 33.1274 30 33.1274C31.7259 33.1274 33.125 31.7283 33.125 30.0024C33.125 28.2766 31.7259 26.8774 30 26.8774Z"
                        fill="#1D3D7E"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.7311 35.1519C13.2437 33.4266 12.5 32.564 12.5 30.0024C12.5 27.4409 13.2437 26.5783 14.7311 24.853C17.7009 21.408 22.6817 17.5024 30 17.5024C37.3183 17.5024 42.2991 21.408 45.269 24.853C46.7563 26.5783 47.5 27.4409 47.5 30.0024C47.5 32.564 46.7563 33.4266 45.269 35.1519C42.2991 38.5969 37.3183 42.5024 30 42.5024C22.6817 42.5024 17.701 38.5969 14.7311 35.1519ZM23.125 30.0024C23.125 26.2055 26.2031 23.1274 30 23.1274C33.797 23.1274 36.875 26.2055 36.875 30.0024C36.875 33.7994 33.797 36.8774 30 36.8774C26.2031 36.8774 23.125 33.7994 23.125 30.0024Z"
                        fill="#1D3D7E"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <p className="w-full text-[#122C5E] text-[20px] not-italic font-regular leading-[100%]">
                      {texts.facade}
                    </p>
                    <p className="w-full text-[#122C5E] text-[16px] not-italic font-regular leading-[100%] opacity-70">
                      {texts.facadeDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
