"use client";

import React, { useEffect } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import Image from "next/image";

const sliderItems = [
  "/img/section9-img1.png",
  "/img/section9-img2.png",
  "/img/section9-img3.png",
  "/img/section9-img4.png",
  "/img/section9-img5.png",
  "/img/section9-img1.png",
];

function ContentOrleuProjectAllHotelSlider() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
  }, []);

  return (
    <div className="section section9 !px-0 !h-auto mb-10 relative z-[10000]">
      <div className="info">
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={50}
          slidesPerView={1}
          loop={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false, // Keep autoplay on user interaction
          }}
          pagination={{ clickable: true }}
          className="info-swiper !px-4 lg:!px-[80px] h-[50dvh] lg:h-[80dvh]"
        >
          {sliderItems.map((item, i) => (
            <SwiperSlide key={`sl-${i}`}>
              <Image
                className="w-full rounded-[16px] h-full object-cover"
                src={item}
                alt="У нас есть новый офис"
                width={1000}
                height={700}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default ContentOrleuProjectAllHotelSlider;
