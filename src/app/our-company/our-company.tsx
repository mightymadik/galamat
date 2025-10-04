"use client";

import MainTemplate from "@/components/common/main-template/main-template";
import React, { useState } from "react";
import "./_why-us.scss";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/autoplay";
import { SITE_URL } from "@/utils/consts";
import HistorySection from "@/components/common/history-section/history-section";
import { useTranslate } from "@/hooks/useTranslate";
import Image from "next/image";
import CompletedProjects from "@/app/our-company/completed-projects";
import { BreadcrumbItem, Breadcrumbs, Button } from "@heroui/react";
import { useDispatch } from "react-redux";
import { setModalSendRequest } from "@/redux/modals";

const sliderHero = [
  {
    title: "Нас выбирают",
    text: "Компания заслуженно входит в число ведущих девелоперов столицы.",
  },
  {
    title: "50 доступных объектов",
    text: "Уже построенных и сданных домов. Всё готово к заселению",
  },
  {
    title: "7 лет надежности",
    text: "Уже 7 лет мы строим не просто дома, а доверие.",
  },
  {
    title: "8500 семей выбрали нас",
    text: "Наши дома стали тёплым и надёжным местом.",
  },
];

function OurCompany() {
  const dispatch = useDispatch();
  const $t = useTranslate();

  const [siccessHistory, setSongHistory] = useState<boolean>(false);

  return (
    <MainTemplate>
      <div className="why-us-wrap">
        <div className="wrapper">
          <Breadcrumbs className="mb-10 text-[14px]">
            <BreadcrumbItem href={SITE_URL.HOME}>{$t("home__")}</BreadcrumbItem>
            <BreadcrumbItem>{$t("about_company")}</BreadcrumbItem>
          </Breadcrumbs>

          <div className="why-us-info">
            <h2>{$t("why_us_")}</h2>
            <p>{$t("galamat_has_20_years_of")}</p>
            <Button
              onPress={() => dispatch(setModalSendRequest(true))}
              className="red-btn"
            >
              {$t("buy_an_apartment")}
            </Button>

            <div className="w-[calc(100%-20px)] lg:w-full">
              <Swiper
                modules={[Autoplay]}
                spaceBetween={16}
                slidesPerView={4}
                loop={false}
                autoplay={{
                  delay: 8000,
                  disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                className="why-us-swiper"
                breakpoints={{
                  300: {
                    slidesPerView: 1,
                    spaceBetween: 0,
                  },
                  768: {
                    slidesPerView: 2,
                    spaceBetween: 16,
                  },
                  1024: {
                    slidesPerView: 4,
                    spaceBetween: 16,
                  },
                }}
              >
                {sliderHero.map((item, i) => (
                  <SwiperSlide key={`home-ads-${i}`} className="!h-[170px]">
                    <b className="block text-blue text-[28px]">{item.title}</b>
                    <span>{item.text}</span>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </div>

      <div className="benefits-buying !mt-[60px]">
        <div className="wrapper">
          <h2>{$t("advantages_of_buying")}</h2>
          <div className="benefits-items">
            <div className="benefits-item item1">
              <span className="text">{$t("with_increased_comfort")}</span>
              <Image
                src="/img/our-company/best-locations-in-capital-city.png"
                alt=""
                width={600}
                height={300}
                className="absolute right-0 bottom-0"
              />
            </div>
            <div className="benefits-item item2">
              <span className="text">{$t("available")}</span>
              <Image
                src="/img/our-company/affordable-prices.png"
                alt=""
                width={500}
                height={400}
                className="absolute right-0 bottom-0 w-[90%] h-auto"
              />
            </div>
            <div className="benefits-item item3">
              <span className="text">{$t("apartment_with_appliances")}</span>
              <Image
                src="/img/our-company/loyalty-program.png"
                alt=""
                width={500}
                height={500}
                className="absolute right-[-20px] bottom-[-50px] w-[280px] lg:min-w-[120%] h-auto"
              />
            </div>
            <div className="benefits-item item4">
              <span className="text w-full !max-w-[150px]">
                {$t("we_always_deliver_on_time")}
              </span>
              <Image
                src="/img/our-company/we-always-deliver-on-time.png"
                alt=""
                width={500}
                height={500}
                className="absolute right-0 top-0 w-full h-full object-cover"
              />
            </div>
            <div className="benefits-item item5">
              <span className="text w-full !max-w-[200px]">
                {$t("professional_management_company")}
              </span>
              <Image
                src="/img/our-company/face-id-and-smart-locks.jpg"
                alt=""
                width={500}
                height={500}
                className="absolute right-0 top-0 w-full max-w-[400px] h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>

      <CompletedProjects onSuccess={(val) => setSongHistory(val)} />

      {siccessHistory ? <HistorySection /> : null}
    </MainTemplate>
  );
}

export default OurCompany;
