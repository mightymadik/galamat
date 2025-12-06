"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/button";
import { useSelector } from "react-redux";

type Card = {
  id: number;
  bg: string;
  icon: string;
  title: string;
  text?: string; // для обычного текста
  date?: string; // для таймера
};

export default function Hero() {
  const selectedLang = useSelector(
    (state: any) => state.translateSite.selectedLang,
  );

  // Russian texts
  const russianTexts = {
    hurry: "Cтарт: 13 Декабря",
    keysIn2026: "Ключи в 2026 году",
    infrastructure: "Цены",
    convenientLocation: "от 16,6 млн ₸",
    comfortClass: "Комфорт класс",
    keysIn2026Badge: "Ключи в 2026 году",
    convenientLocationBadge: "Удобная локация",
    improvedRoughFinishing: "Улучшенная черновая отделка",
    watchVideo: "Оставить заявку",
    viewOnMap: "Смотреть на карте",
    galaxyStar: "ЖК Galaxy Star ",
    address: "Астана, район Нура, улица Чингиз Айтматова",
    booklet: "Скачать буклет",
  };

  // Kazakh texts
  const kazakhTexts = {
    hurry: "Yлгеріңіз",
    keysIn2026: "2026 жылы кілттер",
    infrastructure: "Бағасы",
    convenientLocation: "16,6 млн ₸-ден",
    comfortClass: "Комфорт санаты",
    keysIn2026Badge: "Кілт 2026 жылы",
    convenientLocationBadge: "Ыңғайлы орналасу",
    improvedRoughFinishing: "Жақсартылған бірінші әрлеу",
    watchVideo: "Өтініш қалдыру",
    viewOnMap: "Картада қарау",
    galaxyStar: "Galaxy Star ЖК ",
    address: "Астана, Нұра ауданы, Чингіз Айтматов көшесі",
    booklet: "Буклетті жүктеу",
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

  // 👇 Укажи конечную дату (например, до конца акции)
  const [timers, setTimers] = useState<Record<number, string>>({});

  const propertyInfo = [
    {
      title: texts.galaxyStar,
      price: "",
      address: texts.address,
    },
  ];

  // Массив бейджей
  const badges = [
    texts.comfortClass,
    texts.keysIn2026Badge,
    texts.convenientLocationBadge,
    texts.improvedRoughFinishing,
  ];

  // Карточки справа
  const cards: Card[] = [
    {
      id: 1,
      bg: "#DB1D31",
      icon: "/img/Rocket.svg",
      title: texts.hurry,
      date: "2025-12-13T00:00:00", // ← таймер
      text: texts.keysIn2026,
    },
    {
      id: 2,
      bg: "#132C5E",
      icon: "/img/SaleSquare.svg",
      title: texts.infrastructure,
      text: texts.convenientLocation, // ← просто текст
    },
  ];

  // Кнопки внизу
  const buttons = [
    {
      id: 1,
      bg: "#DB1D31",
      textColor: "#FFF",
      text: texts.watchVideo,
    },
    {
      id: 2,
      bg: "#ECF0F8",
      textColor: "#132C5E",
      text: texts.booklet,
      link: "https://drive.google.com/drive/folders/1aTnF3P2aIOglbFGUQyzeIAuXACPO2xzI?usp=sharing",
    },
  ];

  const scrollToLeaveRequest = () => {
    const el = document.getElementById("leave-request");
    if (!el) {
      return;
    }

    const elementRect = el.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle =
      absoluteElementTop - window.innerHeight / 2 + elementRect.height / 2;

    window.scrollTo({
      top: middle,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const updatedTimers: Record<number, string> = {};

      cards.forEach((card) => {
        if (!card.date) {
          return;
        }

        const target = new Date(card.date).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) {
          updatedTimers[card.id] = "00 : 00 : 00 : 00";
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          updatedTimers[card.id] = `${String(days).padStart(2, "0")} : ${String(
            hours,
          ).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(
            seconds,
          ).padStart(2, "0")}`;
        }
      });

      setTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [cards]);

  return (
    <div>
      <div className="py-[40px] flex flex-col items-center gap-[128px] flex-shrink-0">
        <div className="wrapper flex flex-col items-start gap-[24px] self-stretch">
          {/* Верхний блок с изображением и карточками */}
          <div className="flex w-full items-center gap-[12px] flex-col lg:flex-row">
            {/* Левая карточка с фоном */}
            <div className="flex min-h-[360px] lg:min-h-auto p-[32px] flex-col justify-end items-start gap-[10px] flex-[1_0_0] self-stretch rounded-[32px] bg-[url('/img/heroImg.png')] bg-cover bg-center bg-no-repeat">
              <div className="flex items-center gap-[4px] flex-wrap lg:flex-no-wrap">
                {badges.map((badge, i) => (
                  <div
                    key={i}
                    className="flex px-[12px] py-[4px] justify-center items-center rounded-[16px] bg-[#F4F5F9]"
                  >
                    <p className="text-[#282D3C] text-center text-[12px] font-normal leading-[100%]">
                      {badge}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Правая колонка с двумя карточками */}
            <div className="flex flex-col items-start gap-[12px] flex-shrink-0 self-stretch flex-row lg:flex-col">
              {cards.map((card, i) => (
                <div
                  key={i}
                  className="w-full max-w-full h-[258px] flex p-[16px] lg:p-[32px] flex-col items-start gap-[10px] rounded-[32px]"
                  style={{ backgroundColor: card.bg }}
                >
                  <div className="flex flex-col justify-between items-start flex-[1_0_0] self-stretch">
                    <Image
                      src={card.icon}
                      alt={card.title}
                      width={64}
                      height={64}
                      className="opacity-50"
                    />
                    <div className="flex flex-col items-start gap-[12px] self-stretch">
                      <h1 className="text-[#FFFFFF] [font-size:_clamp(16px,3vw,24px)] font-medium leading-[100%]">
                        {card.title}
                      </h1>
                      <p className="text-[#FFFFFF] [font-size:_clamp(16px,3vw,24px)] leading-[100%]">
                        {card.date
                          ? timers[card.id] || "00 : 00 : 00 : 00"
                          : card.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Нижний блок с названием и кнопками */}
          <div className="flex w-full items-start lg:items-center gap-[24px] flex-col lg:flex-row">
            <div className="flex flex-col items-start gap-[16px] flex-[1_0_0]">
              {propertyInfo.map((property, i) => (
                <div key={i} className="flex flex-col gap-[12px]">
                  <div className="flex flex-start lg:items-center gap-[8px] flex-col lg:flex-row ">
                    <h1 className="text-[#1E1E1E] [font-size:_clamp(20px,4vw,44px)] not-italic font-medium leading-[100%]">
                      {property.title}
                    </h1>
                    <span className="text-[#132C5E] [font-size:_clamp(20px,4vw,44px)] not-italic font-medium leading-[100%] opacity-50">
                      {property.price}
                    </span>
                  </div>
                  <p className="text-[#1E1E1E] [font-size:_clamp(16px,3vw,24px)] leading-[100%]">
                    {property.address}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap lg:max-w-[445px] h-[44px] flex-shrink-0 gap-[8px] lg:gap-[16px] self-stretch">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="inline-flex items-center rounded-[64px]"
                  style={{ backgroundColor: btn.bg }}
                >
                  <Button
                    onClick={() => {
                      if (btn.id === 1) {
                        // First button scrolls to leave-request
                        scrollToLeaveRequest();
                      } else if (btn.id === 2 && btn.link) {
                        // Second button acts as a link
                        window.open(btn.link, "_blank");
                      }
                    }}
                    className="!p-[4px] flex justify-center items-center gap-[4px] bg-transparent min-w-[176px] lg:max-w-[200px]"
                    style={{ color: btn.textColor }}
                  >
                    {btn.text}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
