"use client";

import React, { useEffect, useRef, useState } from "react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Mousewheel } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Button } from "@heroui/react";
import Image from "next/image";
import lgZoom from "lightgallery/plugins/zoom";
import lgThumbnail from "lightgallery/plugins/thumbnail";
import LightGallery from "lightgallery/react";

const sliderBlocks = [
  "/img/orleu-page/block-1.png",
  "/img/orleu-page/block-2.png",
  "/img/orleu-page/block-3.png",
  "/img/orleu-page/block-4.png",
  "/img/orleu-page/block-5.png",
  "/img/orleu-page/block-6.png",
  "/img/orleu-page/block-7.png",
  "/img/orleu-page/block-8.png",
  "/img/orleu-page/block-9.png",
  "/img/orleu-page/block-10.png",
];

interface IThisProps {
  sendRequest: () => void;
}

function ContentOrleuProjectHomeMap({ sendRequest }: IThisProps) {
  const [activeSlider, setActiveSlider] = useState(0);
  const swiperRef = useRef<any>(null);
  const swiperRefMobile = useRef<any>(null);

  useEffect(() => {
    if (activeSlider > sliderBlocks.length - 1) {
      setActiveSlider(sliderBlocks.length - 1);
    }

    if (activeSlider < 0) {
      setActiveSlider(0);
    }
  }, [activeSlider]);

  function SliderNext() {
    swiperRefMobile.current?.slideNext();
    swiperRef.current?.slideNext();
  }

  function SliderPrev() {
    swiperRefMobile.current?.slidePrev();
    swiperRef.current?.slidePrev();
  }

  const galleryRefMap = useRef<any>(null);

  return (
    <div className="section section8 !h-auto !min-h-auto relative z-[1000]">
      <div className="planning-wrap">
        <div className="title-wrap">
          <h2>Планировочные решения</h2>
          <div className="arrow-wrap">
            <div className="slider-navigation">
              <button type="button" className="slick-prev" onClick={SliderPrev}>
                <img src="/img/slider-arr.svg" alt="" />
              </button>
              <button type="button" className="slick-next" onClick={SliderNext}>
                <img src="/img/slider-arr.svg" alt="" />
              </button>
            </div>
            <Button onPress={sendRequest} className="planing-btn">
              Выбрать квартиру
            </Button>
          </div>
        </div>
        <div className="w-full grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-9 lg:h-[80dvh] flex-jc-c bg-[#F3F7FF] rounded-[20px] overflow-hidden p-6">
            <img
              src={sliderBlocks[activeSlider]}
              alt=""
              onClick={() => galleryRefMap.current?.openGallery(activeSlider)}
              className="w-full rounded-[12px] cursor-pointer"
            />
          </div>
          <div
            ref={galleryRefMap}
            className="col-span-12 lg:col-span-3 lg:h-[80dvh] gap-4 rounded-[12px] lg:rounded-[20px] overflow-hidden"
          >
            <LightGallery
              galleryId="product-gallery"
              plugins={[lgZoom, lgThumbnail]}
              onInit={(detail: any) => {
                galleryRefMap.current = detail.instance;
              }}
              thumbnail={true}
              elementClassNames="hidden"
            >
              {sliderBlocks.map((image, i) => (
                <a key={`lg-item-${i}`} data-src={image}>
                  <Image
                    src={image}
                    alt=""
                    width={100}
                    height={100}
                    className="hidden min-h-[440px]"
                  />
                </a>
              ))}
            </LightGallery>

            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              direction="vertical"
              slidesPerView={3}
              spaceBetween={30}
              mousewheel={true}
              pagination={{
                clickable: true,
              }}
              onSlideChange={(swiper) => setActiveSlider(swiper.activeIndex)}
              modules={[Mousewheel]}
              className="mySwiper !hidden lg:!block h-[80dvh]"
            >
              {sliderBlocks.map((item, index) => (
                <SwiperSlide key={item}>
                  <div
                    className="w-full h-full flex-jc-c overflow-hidden border-[4px] border-[#1a3b7e]/20 bg-[#F3F7FF] rounded-[20px] cursor-pointer transition hover:border-[#1a3b7e]"
                    onClick={() => swiperRef.current?.slideTo(index)}
                  >
                    <img
                      src={item}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <Swiper
              onSwiper={(swiper) => {
                swiperRefMobile.current = swiper;
              }}
              slidesPerView={3}
              spaceBetween={15}
              onSlideChange={(swiper) => setActiveSlider(swiper.activeIndex)}
              className="mySwiper !block lg:!hidden max-h-[200px]"
            >
              {sliderBlocks.map((item, index) => (
                <SwiperSlide key={item}>
                  <div
                    className="w-full h-full flex-jc-c p-1 lg:p-9 bg-[#F3F7FF] rounded-[12px] cursor-pointer transition hover:bg-blue/10"
                    onClick={() => setActiveSlider(index)}
                  >
                    <Image
                      src={item}
                      alt="image"
                      className="w-[90%] rounded-[5px]"
                      width={300}
                      height={200}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectHomeMap;
