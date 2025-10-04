"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";
import { Button } from "@heroui/react";
import Link from "next/link";

interface IThisProps {
  sendRequest: () => void;
}

function ContentOrleuProject({ sendRequest }: IThisProps) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const leftImageX = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const leftImageY = useTransform(scrollYProgress, [0, 1], ["0", "-200px"]);
  const mountainScale = useTransform(scrollYProgress, [0, 1], ["1", "0.4"]);
  const mountainOpacity = useTransform(scrollYProgress, [0.8, 1], ["1", "0"]);

  const mountainMoveLeft = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "-10%"],
  );
  const mountainMoveCenter = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "-20%"],
  );

  // HOME SECTION
  const homeMoveTop = useTransform(scrollYProgress, [0, 1], ["180%", "-70%"]);
  const homeOpacity = useTransform(scrollYProgress, [0.9, 1], ["1", "0"]);

  // LOGO
  const logoMoveBottom = useTransform(scrollYProgress, [0, 1], ["0", "1000%"]);
  const logoOpacity = useTransform(scrollYProgress, [0, 0.4], ["1", "0"]);

  // APARTMENT
  const leaveApartment = useTransform(
    scrollYProgress,
    [0, 1],
    ["-1000px", "300px"],
  );
  const apartmentOpacity = useTransform(scrollYProgress, [0.7, 1], ["1", "0"]);

  return (
    <div ref={containerRef} className="w-full h-[2000px] md:h-[4000px]">
      <div className="text-center">
        <h2 className="text-[30px] md:text-[60px] text-[#1A3B7E] font-medium">
          Жилой комплекс
        </h2>
      </div>

      <div className="fixed left-1/2 transform translate-x-[-50%] top-[200px] pointer-events-none">
        <motion.img
          src="img/orleu-logo.svg"
          alt="orleu logo"
          style={{ y: logoMoveBottom, opacity: logoOpacity }}
        />
      </div>

      <div className="w-full h-[100dvh] fixed left-0 top-0 z-10  flex-jc-e pointer-events-none">
        <motion.div
          style={{
            x: leftImageX,
            y: leftImageY,
            scale: mountainScale,
            opacity: mountainOpacity,
          }}
          className="mountain-after h-[100px] md:h-[600px] w-full origin-bottom"
        >
          <motion.img
            src="img/sect1-bg.png"
            alt="sect1"
            className="object-cover absolute left-0 bottom-0 z-10 w-[70%]"
            width={1400}
            height={900}
            style={{ x: mountainMoveLeft }}
          />
          <motion.img
            src="img/mountain-center.png"
            alt="sect1"
            className="object-cover absolute left-0 bottom-0 w-full"
            width={1400}
            height={900}
            style={{ x: mountainMoveCenter }}
          />
          <motion.img
            src="img/sect1-bg2.png"
            alt="sect1"
            className="object-cover absolute right-0 bottom-0 z-10 w-[80%]"
            width={1400}
            height={900}
          />
        </motion.div>
      </div>

      <motion.img
        src="img/sect2-bg.png"
        alt=""
        className="fixed top-[200px] right-0 w-[90%] z-10 pointer-events-none"
        style={{ y: homeMoveTop, opacity: homeOpacity }}
      />

      <motion.div
        style={{ x: leaveApartment, opacity: apartmentOpacity }}
        className="section section2 !fixed top-[0] min-h-[900px]:top-[200px] left-[100px] z-[1000]"
      >
        <div className="info transform scale-80 min-h-[900px]:scale-100">
          <div className="texts">
            <img src="/img/orleu-logo.svg" alt="" />
            <p>
              <img src="/img/icon1.svg" alt="" />
              Срок сдачи: I квартал 2026 года
            </p>
            <p>
              <img src="/img/iicon2.svg" alt="" />
              г. Астана, р-н Алматы, ул. Айнаколь
            </p>
            <div className="buttons">
              <Button className="blue-btn2 !py-6" onPress={sendRequest}>
                Выбрать квартиру
              </Button>
              <Link
                href="https://drive.google.com/drive/folders/1D2Ib3V9SHjXxy-MYXIs2wceoQivEESqV"
                target="_blank"
                className="light-blue-btn"
              >
                Скачать буклет
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ContentOrleuProject;
