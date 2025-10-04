"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SendRequest from "@/components/layout/orleu-project/send-request";

function ContentOrleuProjectTwo() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 600px", "end start"],
  });

  const leftImageX = useTransform(scrollYProgress, [0, 1], ["-30%", "150%"]);
  const leftImageY = useTransform(scrollYProgress, [0, 1], ["0", "-20%"]);
  const opacityHouse = useTransform(scrollYProgress, [0.001, 0.2], ["0", "1"]);
  const opacityHouseClose = useTransform(
    scrollYProgress,
    [0.7, 0.9],
    ["1", "0"],
  );

  return (
    <div ref={containerRef} className="h-[4000px] mt-[800px]">
      <motion.div
        style={{ opacity: opacityHouseClose }}
        className="section section3 reltive"
      >
        <div className="info">
          <motion.img
            src="img/sect3-bg.png"
            alt=""
            className="!fixed left-0 bottom-0 w-full z-[-1] pointer-events-none"
            style={{
              opacity: opacityHouse,
              y: leftImageY,
            }}
          />
          <img src="img/style.png" alt="" className="style" />
          <motion.div style={{ x: leftImageX }} className="texts mt-[400px]">
            <h2>
              <img src="img/title-style.svg" alt="title" /> Преимущества
            </h2>
            <p>
              Жилой комплекс «Örleu» — это новый проект комфорт класса от
              компании Galamat, расположенный на правом берегу столицы в 10
              минутах езды от площади «Қазақ елі».
            </p>
            <div className="tags">
              <span className="tag cursor-pointer">Комфорт класс</span>
              <span className="tag cursor-pointer">9 этажей</span>
              <span className="tag cursor-pointer">10 подъездов</span>
              <span className="tag cursor-pointer">448 квартир</span>
              <span className="tag cursor-pointer">Потолки - 3м</span>
              <span className="tag cursor-pointer">
                3-6 квартир на площадке
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="section section4 !relative !z-[10000000000000] mt-[500px]">
        <div className="info">
          <SendRequest />
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectTwo;
