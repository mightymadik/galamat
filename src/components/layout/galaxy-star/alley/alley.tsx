"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import Map from "../map/map";

export default function Alley() {
  const selectedLang = useSelector(
    (state: any) => state.translateSite.selectedLang,
  );

  // Russian texts
  const russianTexts = {
    environment: "Окружение",
    alley: "Аллея— в двух шагах",
    description: `Прямо у ЖК Galaxy Star расположена уютная зелёная аллея — большое преимущество для жителей комплекса.
Здесь есть всё для активного и спокойного отдыха: современная игровая площадка для детей, полноценное футбольное поле, воркаут-зоны, а также отдельные тихие уголки для чтения и расслабления. Ухоженные дорожки идеально подходят для вечерних прогулок, пробежек или семейного времяпрепровождения.

Это пространство становится продолжением вашего двора — местом, где можно проводить время каждый день, не уезжая далеко от дома.`,
    services: "Сервисы для счастливой жизни",
    internet: "Интернет Starlink",
    internetDesc:
      "Бесплатный интернет Starlink на аллее — для удобства каждого жителя.",
    ownAlley: "Собственная Аллея",
    ownAlleyDesc:
      "Рядом с ЖК Galaxy Star проходит уютная зелёная аллея — одно из ключевых преимуществ для жителей",
    infrastructure: "Развитая инфраструктура",
    infrastructureDesc:
      "Galaxy Star расположен в стремительно развивающемся районе левого берега.",
    charging: "Зарядные станции",
    chargingDesc:
      "На аллее установлены зарядные станции Edrive для электромобилей — доступны всем жителям",
    salesOffices: "Расположение ЖК",
  };

  // Kazakh texts
  const kazakhTexts = {
    environment: "Жоба туралы",
    alley: "Аллея - екі қадам жерде",
    description: `Galaxy Star тұрғын үй кешенінің дәл жанында жайлы жасыл аллея орналасқан — бұл кешен тұрғындары үшін үлкен артықшылық Мұнда тыныш әрі белсенді демалысқа қажетті барлық жағдай бар: заманауи балалар ойын алаңы, толыққанды футбол алаңы, воркаут-аймақтар, сондай-ақ кітап оқуға және демалуға арналған тыныш бұрыштар. Көрікті жолдар кешкі серуенге, жүгіруге немесе отбасылық демалысқа өте қолайлы.

Бұл кеңістік сіздің аулаңыздың табиғи жалғасына айналады — үйден алысқа бармай-ақ күн сайын уақыт өткізуге болатын ерекше орын.

Бұл кеңістік сіздің ауылыңыздың жалғасуы болып табылады - үйден алыс жүрмей, күн сайын уақыт өткізуге болатын орын.`,
    services: "Бақытты өмір үшін қызметтер",
    internet: "Starlink интернеті",
    internetDesc:
      "Аллеядағы тегін Starlink интернеті - әрбір тұрғынның ыңғайлылығы үшін.",
    ownAlley: "Меншікті Аллея",
    ownAlleyDesc:
      "Galaxy Star ЖК-нің қасында жайлы жасыл аллея өтеді - бұл тұрғындар үшін негізгі артықшылықтардың бірі",
    infrastructure: "Дамыған инфрақұрылым",
    infrastructureDesc:
      "Galaxy Star сол жағалауы дамып келе жатқан аймақта орналасқан.",
    charging: "Зарядтық станциялар",
    chargingDesc:
      "Аллеяда электромобильдерге арналған Edrive зарядтық станциялары орнатылған - барлық тұрғындарға қолжетімді",
    salesOffices: "ТҮК орналысуы",
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

  const images = [
    "/img/1.jpg",
    "/img/2.jpg",
    "/img/3n.jpg",
    "/img/4.jpg",
    "/img/5.jpg",
    "/img/6.jpg",
    "/img/7.jpg",
    "/img/8.jpg",
    "/img/9.jpg",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const swipeThreshold = 50; // px
  let touchStartX = 0;

  // Auto slide
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) < swipeThreshold) {
      return;
    }

    if (diff > 0) {
      // swipe right → prev slide
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    } else {
      // swipe left → next slide
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  return (
    <div className="py-[40px] lg:py-[64px]">
      <div className="wrapper">
        <div className="flex justify-center items-start gap-[32px] self-stretch flex-col lg:flex-row">
          <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
            <span className="text-[#8B8DA5] text-[36px] not-italic font-medium leading-[100%]">
              {texts.environment}
            </span>
            <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[100%]">
              {texts.alley}
            </h1>
          </div>
          <p className="flex-[1_0_0] text-[16px] not-italic font-regular leading-[23px]">
            {texts.description}
          </p>
        </div>
        <div
          className="relative h-[600px] w-full overflow-hidden my-[64px] rounded-[32px] bg-[#F4F6FB] flex-wrap"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((src, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={src}
                alt={`Slide ${index + 1}`}
                fill
                className="object-cover rounded-[32px]"
                priority={index === 0}
              />
            </div>
          ))}

          {/* Индикаторы */}
          <div className="absolute bottom-[32px] left-0 right-0 flex justify-center gap-[12px] flex-wrap">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-[5px] w-[80px] rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="wrapper flex flex-col items-start gap-[34px] self-stretch">
        <h1 className="text-[#202028] text-[36px] not-italic font-medium leading-[41.76px]">
          {texts.services}
        </h1>
        <div className="flex justify-start items-center gap-[12px] lg:gap-[30px] self-stretch overflow-x-auto scrollbar-hide">
          <div className="flex min-w-[300px] w-full h-[300px] p-[32px] flex-col items-start gap-[10px] rounded-[32px] bg-[#F4F6FB]">
            <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
              <Image
                src="/img/Palette.svg"
                width={64}
                height={64}
                alt="Palette"
              />
              <div className="flex flex-col items-start gap-[14px] self-stretch">
                <h1 className="text-[#282D3C] text-[20px] not-italic font-medium leading-full tracking-[-0.9px]">
                  {texts.internet}
                </h1>
                <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">
                  {texts.internetDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-[300px] w-full h-[300px] p-[32px] flex-col items-start gap-[10px] rounded-[32px] bg-[#F4F6FB]">
            <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
              <Image
                src="/img/Palette.svg"
                width={64}
                height={64}
                alt="Palette"
              />
              <div className="flex flex-col items-start gap-[14px] self-stretch">
                <h1 className="text-[#282D3C] text-[20px] not-italic font-medium leading-full tracking-[-0.9px]">
                  {texts.ownAlley}
                </h1>
                <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">
                  {texts.ownAlleyDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-[300px] w-full h-[300px] p-[32px] flex-col items-start gap-[10px] rounded-[32px] bg-[#F4F6FB]">
            <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
              <Image
                src="/img/Palette.svg"
                width={64}
                height={64}
                alt="Palette"
              />
              <div className="flex flex-col items-start gap-[14px] self-stretch">
                <h1 className="text-[#282D3C] text-[20px] not-italic font-medium leading-full tracking-[-0.9px]">
                  {texts.infrastructure}
                </h1>
                <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">
                  {texts.infrastructureDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-w-[300px] w-full h-[300px] p-[32px] flex-col items-start gap-[10px] rounded-[32px] bg-[#F4F6FB]">
            <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
              <Image
                src="/img/Palette.svg"
                width={64}
                height={64}
                alt="Palette"
              />
              <div className="flex flex-col items-start gap-[14px] self-stretch">
                <h1 className="text-[#282D3C] text-[20px] not-italic font-medium leading-full tracking-[-0.9px]">
                  {texts.charging}
                </h1>
                <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[16px]">
                  {texts.chargingDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="!py-[40px] lg:py-[64px] wrapper flex flex-col items-start gap-[32px]">
        <h1 className="text-[36px] font-medium text-[#202028] leading-[41.76px]">
          {texts.salesOffices}
        </h1>
        <div className="w-full h-[630px] rounded-xl overflow-hidden">
          <Map />
        </div>
      </div>
    </div>
  );
}
