"use client";

import "./ads-slider.scss";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

import LeftSlider from "@/components/layout/home/ads-slider/left-slider";
import { ActionGetSlidersFade } from "@/app/actions/admin/pages/home/slider-fade/get-sliders-fade";
import { filesLink } from "@/utils/consts";
import { Skeleton } from "@heroui/react";

function AdsSlider() {
  const activeLang = useSelector(
    (state: IStateTranslate) => state.translateSite.selectedLang,
  );

  const [items, setItems] = useState<ISliderItem[]>([]);

  useEffect(() => {
    ActionGetSlidersFade("slider-carousel").then(({ data }) => {
      setItems(data as ISliderItem[]);
    });
  }, []);

  // Flatten all slide items from children
  const allSlides = items.flatMap((item) => item.children ?? []);

  return (
    <div className="info-block">
      <div className="wrapper">
        <div className="info">
          <LeftSlider />

          {allSlides.length > 1 ? (
            <Swiper
              modules={[Pagination, Autoplay, Navigation]}
              spaceBetween={30}
              slidesPerView={1}
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              navigation={{
                nextEl: ".swiper-button-next-header-slider",
                prevEl: ".swiper-button-prev-header-slider",
              }}
              pagination={{ clickable: true }}
              className="info-swiper rounded-[16px] overflow-hidden lg:h-[510px] relative"
            >
              {allSlides
                .sort((a, b) => a.sort_index - b.sort_index)
                .map((sliderItem) => {
                  const imagePath = sliderItem.children?.find(
                    (child) => child.lang_key === activeLang,
                  )?.image_path;

                  return (
                    <SwiperSlide key={`home-slider-ads-${sliderItem.id}`}>
                      <Link href={sliderItem.url} className="w-full h-auto">
                        {imagePath && (
                          <Image
                            className="w-full object-cover rounded-[20px] lg:h-[510px] object-left-top"
                            src={`${filesLink}${imagePath}`}
                            alt="Слайд"
                            width={1000}
                            height={700}
                          />
                        )}
                      </Link>
                    </SwiperSlide>
                  );
                })}
              <div className="absolute left-0 top-[50%] w-full flex-jsb-c px-2 md:px-4 z-10 transform translate-y-[-50%]">
                <div className="swiper-button-prev-header-slider w-8 md:w-[50px] h-8 md:h-[50px] bg-white rounded-full flex-jc-c cursor-pointer opacity-60 hover:opacity-100">
                  <img
                    src="img/slider-arrow.svg"
                    alt=""
                    className="transform rotate-180"
                  />
                </div>
                <div className="swiper-button-next-header-slider w-8 md:w-[50px] h-8 md:h-[50px] bg-white rounded-full flex-jc-c cursor-pointer opacity-60 hover:opacity-100">
                  <img src="img/slider-arrow.svg" alt="" />
                </div>
              </div>
            </Swiper>
          ) : (
            <Skeleton className="info-swiper w-full h-[510px] rounded-[24px]" />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdsSlider;
