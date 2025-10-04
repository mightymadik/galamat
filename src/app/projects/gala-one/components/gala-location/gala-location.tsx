import "./_gala-location.scss";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

function GalaLocation() {
  return (
    <div className="gala-location mt-10">
      <div className="wrapper">
        <div className="info">
          <div className="top">
            <h2>Идеальное расположение для активной жизни</h2>
            <p>
              Gala One окружён всем необходимым для активной и комфортной жизни.
              Здесь сочетаются удобство, энергия города и тишина уюта.
            </p>
          </div>
          <Swiper
            modules={[Pagination, Autoplay, Navigation]}
            spaceBetween={30}
            slidesPerView={4}
            loop={false}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            // navigation={{
            //   nextEl: next.current,
            //   prevEl: prev.current,
            // }}
            pagination={{ clickable: true }}
            breakpoints={{
              320: {
                slidesPerView: "auto",
                spaceBetween: 10,
              },
              767: {
                slidesPerView: 3,
                spaceBetween: 10,
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 10,
              },
              1200: {
                slidesPerView: 4,
              },
            }}
            className="locationSwiper"
          >
            <SwiperSlide>
              <div className="top-line">
                <div className="icon">
                  <img src="/img/gala-loc-icon1.svg" alt="" />
                </div>
                <span>Торговые центры</span>
              </div>
              <ul>
                <li>
                  <span className="circle"></span>
                  <span className="text">ТРЦ Mega Silk Way</span>
                </li>
                <li>
                  <span className="circle"></span>
                  <span className="text">ТРЦ Ellington Mall</span>
                </li>
                <li>
                  <span className="circle"></span>
                  <span className="text">Супермаркет Small</span>
                </li>
              </ul>
            </SwiperSlide>
            <SwiperSlide>
              <div className="top-line">
                <div className="icon">
                  <img src="/img/gala-loc-icon2.svg" alt="" />
                </div>
                <span>Спортивные комплексы</span>
              </div>
              <ul>
                <li>
                  <span className="circle"></span>
                  <span className="text">Барыс Арена</span>
                </li>
                <li>
                  <span className="circle"></span>
                  <span className="text">ЛАСК «Qazaqstan»</span>
                </li>
                <li>
                  <span className="circle"></span>
                  <span className="text">ЛД «Алау»</span>
                </li>
              </ul>
            </SwiperSlide>
            <SwiperSlide>
              <div className="top-line">
                <div className="icon">
                  <img src="/img/gala-loc-icon3.svg" alt="" />
                </div>
                <span>Учебные учреждения</span>
              </div>
              <ul>
                <li>
                  <span className="circle"></span>
                  <span className="text">AITU</span>
                </li>
                <li>
                  <span className="circle"></span>
                  <span className="text">Назарбаев Университет</span>
                </li>
              </ul>
            </SwiperSlide>
            <SwiperSlide>
              <div className="top-line">
                <div className="icon">
                  <img src="/img/gala-loc-icon4.svg" alt="" />
                </div>
                <span>Парки</span>
              </div>
              <ul>
                <li>
                  <span className="circle"></span>
                  <span className="text">Eco-Park</span>
                </li>
              </ul>
              <div className="swiper-pagination"></div>
            </SwiperSlide>
          </Swiper>

          <div className="img-wrap">
            <img src="/img/gala-location-img.png" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GalaLocation;
