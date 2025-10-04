import "./style.scss";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import Image from "next/image";
import { useRef } from "react";
import { PhotoProvider, PhotoView } from "react-photo-view";

const images = [
  "/img/gala-one/gala-one-project-1.jpg",
  "/img/gala-one/gala-one-project-2.jpg",
  "/img/gala-one/gala-one-project-3.jpg",
  "/img/gala-one/gala-one-project-4.jpg",
  "/img/gala-one/gala-one-project-5.jpg",
  "/img/gala-one/gala-one-project-6.jpg",
  "/img/gala-one/gala-one-project-7.jpg",
  "/img/gala-one/gala-one-project-8.jpg",
  "/img/gala-one/gala-one-project-9.jpg",
  "/img/gala-one/gala-one-project-10.jpg",
  "/img/gala-one/gala-one-project-11.jpg",
  "/img/gala-one/gala-one-project-12.jpg",
  "/img/gala-one/gala-one-project-13.jpg",
];

function HeroSlider() {
  const next = useRef(null);
  const prev = useRef(null);

  return (
    <div className="banner-slider-wrap">
      <div className="wrapper">
        <PhotoProvider loop={false}>
          <Swiper
            modules={[Pagination, Autoplay, Navigation]}
            spaceBetween={15}
            slidesPerView={5}
            loop={true}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            navigation={{
              nextEl: next.current,
              prevEl: prev.current,
            }}
            pagination={{ clickable: true }}
            breakpoints={{
              320: {
                slidesPerView: 2,
                spaceBetween: 10,
              },
              480: {
                slidesPerView: 3,
                spaceBetween: 10,
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 10,
              },
              1200: {
                slidesPerView: 5,
              },
            }}
            className="bannerSwiper"
          >
            {images.map((sliderItem, index) => {
              return (
                <SwiperSlide key={`home-slider-gala-one-${index}`}>
                  <PhotoView src={sliderItem}>
                    <Image
                      src={sliderItem}
                      alt="Слайд"
                      width={300}
                      height={200}
                    />
                  </PhotoView>
                </SwiperSlide>
              );
            })}
            <div ref={prev} className="arrows-wrap relative z-10">
              <div className="swiper-button-prev cursor-pointer">
                <img src="/img/gala-slider-arr.svg" alt="" />
              </div>
              <div className="swiper-pagination"></div>
              <div ref={next} className="swiper-button-next cursor-pointer">
                <img src="/img/gala-slider-arr.svg" alt="" />
              </div>
            </div>
          </Swiper>
        </PhotoProvider>
      </div>
    </div>
  );
}

export default HeroSlider;
