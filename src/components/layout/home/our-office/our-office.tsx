import "./our-office.scss";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { RandomKey } from "@/utils/helpers";
import { useTranslate } from "@/hooks/useTranslate";

const sliderItems = [
  "img/slider/galamat-cetchen.jpg",
  "img/slider/Galamat-office.jpg",
  "img/slider/office-1.jpg",
  "img/slider/office-2.jpg",
  "img/slider/galamat-rakurs-street.jpg",
  "img/slider/galamat-reseption.jpg",
  "img/slider/reseption.jpg",
  "img/slider/orleo-post.jpg",
];

function OurOffice() {
  const $t = useTranslate();
  return (
    <div className="our-office mt-6 md:mt-[80px]">
      <div className="wrapper">
        <h2 className="main-title">{$t("our_office")}</h2>

        <Swiper
          modules={[Pagination, Navigation, Autoplay]}
          spaceBetween={50}
          slidesPerView={1}
          pagination={{ clickable: true }}
          loop={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false, // Keep autoplay on user interaction
          }}
          navigation={{
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          }}
          onInit={(swiper) => {
            swiper.navigation.init();
            swiper.navigation.update();
          }}
          className="office-swiper rounded-[16px] overflow-hidden group"
        >
          {sliderItems.map((item) => (
            <SwiperSlide key={RandomKey()}>
              <div className="bg" style={{ backgroundImage: `url(${item})` }} />
            </SwiperSlide>
          ))}

          <div className="slider-nav flex-jsb-c px-4 opacity-0 transition group-hover:opacity-100">
            <div className="swiper-button-prev">
              <img src="img/slider-arrow.svg" alt="" />
            </div>
            <div className="swiper-button-next">
              <img src="img/slider-arrow.svg" alt="" />
            </div>
          </div>
        </Swiper>
      </div>
    </div>
  );
}

export default OurOffice;
