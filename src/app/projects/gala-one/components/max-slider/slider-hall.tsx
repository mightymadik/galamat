import { Swiper, SwiperSlide } from "swiper/react";
import Image from "next/image";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useEffect, useRef, useState } from "react";
import { PhotoProvider, PhotoView } from "react-photo-view";

const images = [
  "/img/gala-one/halls/halls-1.jpg",
  "/img/gala-one/halls/halls-2.jpg",
  "/img/gala-one/halls/halls-3.jpg",
  "/img/gala-one/halls/halls-4.jpg",
  "/img/gala-one/halls/halls-5.jpg",
  "/img/gala-one/halls/halls-6.jpg",
];

function SliderHalls() {
  const next = useRef(null);
  const prev = useRef(null);

  const slider = useRef<any>(null);

  const [activeSlider, setActiveSlider] = useState(0);

  useEffect(() => {
    if (activeSlider) {
      slider.current.slideTo(activeSlider);
    }
  }, [activeSlider]);

  return (
    <>
      <PhotoProvider loop={false}>
        <Swiper
          modules={[Pagination, Autoplay, Navigation]}
          spaceBetween={15}
          slidesPerView={5}
          loop={false}
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
          onSwiper={(swiper) => {
            slider.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setActiveSlider(swiper.activeIndex);
          }}
          className="banner2Swiper"
        >
          {images.map((sliderItem, index) => {
            return (
              <SwiperSlide
                key={`hall-slider-gala-one-${index}`}
                onClick={() => {
                  setActiveSlider(index);
                }}
              >
                <Image
                  src={sliderItem}
                  alt="Слайд"
                  width={300}
                  height={200}
                  className="!h-[181px] object-cover cursor-pointer"
                />
              </SwiperSlide>
            );
          })}
          <div className="arrows-wrap">
            <div
              ref={prev}
              className="swiper-button-prev cursor-pointer relative z-[10000]"
            >
              <img src="/img/gala-slider-arr.svg" alt="" />
            </div>
            <div className="w-full z-[-1]" />
            <div
              ref={next}
              className="swiper-button-next cursor-pointer relative z-[10000]"
            >
              <img src="/img/gala-slider-arr.svg" alt="" />
            </div>
          </div>
        </Swiper>

        <div className="slider-big-image">
          <PhotoView src={images[activeSlider]}>
            <img
              src={images[activeSlider]}
              alt="Slider image item"
              className="cursor-pointer"
            />
          </PhotoView>
        </div>
      </PhotoProvider>
    </>
  );
}

export default SliderHalls;
