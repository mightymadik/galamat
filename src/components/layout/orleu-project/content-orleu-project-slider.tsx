"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

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

const imagesMax = [
  "/img/halls-img1-max.jpg",
  "/img/halls-img2-max.jpg",
  "/img/halls-img3-max.jpg",
  "/img/halls-img4-max.jpg",
  "/img/halls-img5-max.jpg",
  "/img/halls-img6-max.jpg",
];

function ContentOrleuProjectSlider() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 500px", "end start"],
  });

  const galleryRef = useRef<any>(null);

  const [checkWindow, setCheckWindow] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isMobile = window.innerWidth < 1024;

    setCheckWindow(isMobile);
  }, []);

  const moveX = useTransform(
    scrollYProgress,
    [checkWindow ? 0.1 : 0.2, 1],
    ["0", "-200%"],
  );
  const moveY = useTransform(
    scrollYProgress,
    [0.1, 0.2],
    [checkWindow ? "0" : "50%", "0%"],
  );
  const opacity = useTransform(scrollYProgress, [0.001, 0.2], ["0", "1"]);

  const opacityForClose = useTransform(scrollYProgress, [0.8, 0.9], ["1", "0"]);

  return (
    <div
      ref={containerRef}
      className="h-[1000px] md:h-[4000px] relative !z-[10]"
    >
      <LightGallery
        galleryId="product-gallery"
        plugins={[lgZoom, lgThumbnail]}
        onInit={(detail: any) => {
          galleryRef.current = detail.instance;
        }}
        thumbnail={true}
        elementClassNames="hidden"
      >
        {imagesMax.map((image, i) => (
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

      <motion.div
        style={{ opacity, y: moveY }}
        className="section section-halls fixed top-[-20px] lg:top-[50px] "
      >
        <motion.div
          style={{ opacity: opacityForClose }}
          className="design-halls-wrap"
        >
          <div className="w-full">
            <motion.div
              ref={galleryRef}
              style={{ x: moveX }}
              className="design-halls flex-js-c gap-6 pr-[50px]"
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
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: opacityForClose }}
          className="info !mt-[10px] lg:!mt-[30px]"
        >
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
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ContentOrleuProjectSlider;
