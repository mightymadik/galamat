"use client";

import React, { useRef } from "react";

// plugins
import lgThumbnail from "lightgallery/plugins/thumbnail";
import lgZoom from "lightgallery/plugins/zoom";

// styles
import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-thumbnail.css";
import "lightgallery/css/lg-zoom.css";
import LightGallery from "lightgallery/react";
import Image from "next/image";

const images = [
  "/img/halls-img1.png",
  "/img/halls-img2.png",
  "/img/halls-img3.png",
  "/img/halls-img4.png",
  "/img/halls-img5.png",
  "/img/halls-img6.png",
];

function ContentOrleuProjectSliderMobile() {
  const galleryRef = useRef<any>(null);

  return (
    <div className="relative !z-[100]">
      <LightGallery
        galleryId="product-gallery"
        plugins={[lgZoom, lgThumbnail]}
        onInit={(detail: any) => {
          galleryRef.current = detail.instance;
        }}
        thumbnail={true}
        elementClassNames="hidden"
      >
        {images.map((image, i) => (
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

      <div className="section section-halls ">
        <div className="design-halls-wrap">
          <div className="w-full">
            <div
              ref={galleryRef}
              className="design-halls flex-js-c gap-6 pr-[50px] overflow-x-auto"
            >
              {images.map((image, i) => (
                <Image
                  key={image}
                  src={image}
                  onClick={() => galleryRef.current?.openGallery(i)}
                  alt="Image 1"
                  width={500}
                  height={500}
                  className="rounded-[20px] h-[180] lg:h-[350px] object-cover gallery-item cursor-pointer"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="info !mt-[10px] lg:!mt-[30px]">
          <div className="texts">
            <h2 className="!mb-2 lg:!mb-6 !text-[23px] lg:!text-[26px]">
              Авторский дизайн холлов
            </h2>
            <p className="!text-[15px] md:!text-[16px]">
              Интерьеры холлов Orleu разработаны по индивидуальному
              дизайн-проекту, сочетающему удобство, эстетику и функциональность.
              Особое внимание уделено освещению, спокойной цветовой палитре и
              уютной атмосфере, чтобы создать ощущение домашнего комфорта.
            </p>
          </div>
          <div className="tags">
            <span className="tag !text-[15px] md:!text-[16px]">
              Бесшумные лифты
            </span>
            <span className="tag !text-[15px] md:!text-[16px]">
              Smart замки
            </span>
            <span className="tag !text-[15px] md:!text-[16px]">Face ID</span>
            <span className="tag !text-[15px] md:!text-[16px]">
              Колясочные зоны
            </span>
            <span className="tag !text-[15px] md:!text-[16px]">
              Зоны ожидания
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectSliderMobile;
