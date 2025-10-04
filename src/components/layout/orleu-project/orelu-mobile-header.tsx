import Image from "next/image";
import { Button } from "@heroui/react";
import Link from "next/link";
import React from "react";
import SendRequest from "@/components/layout/orleu-project/send-request";

interface IThisProps {
  sendRequest: () => void;
}

function OreluMobileHeader({ sendRequest }: IThisProps) {
  return (
    <div className="p-4">
      <div className="flex-jc-c flex-col min-[425px]:px-6">
        <h2 className="text-[20px] min-[425px]:text-[30px] text-[#1A3B7E] font-medium">
          Жилой комплекс
        </h2>
        <Image
          src="img/orleu-logo.svg"
          alt="orleu logo"
          width={500}
          height={200}
          className="w-full max-w-[500px] h-auto"
        />
      </div>

      <div className="w-[calc(100%+32px)] ml-[-16px] mountain-after before:!hidden relative">
        <Image
          src="/img/orleu-page/mobile-header-bg.png"
          alt="mobile-header-bg"
          width={800}
          height={500}
          className="w-full h-auto object-cover"
        />
        <img
          src="/img/sect2-bg.png"
          alt=""
          className="absolute bottom-[-30px] right-0 w-full max-w-[500px] pointer-events-none z-[1000]"
        />
      </div>

      <div className="section section2 !pb-0">
        <div className="info !p-1">
          <div className="texts">
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
      </div>

      <div className="mt-8">
        <div className="section section3 reltive !min-h-auto !h-auto">
          <div className="info !p-0">
            <div className="w-[calc(100%+32px)] ml-[-16px] mountain-after before:!hidden relative">
              <Image
                src="/img/sect3-bg.png"
                alt="mobile-header-bg"
                width={800}
                height={500}
                className="w-full h-auto object-cover"
              />
              <img src="/img/style.png" alt="" className="style" />
            </div>

            <div className="texts mt-10">
              <h2>
                <img src="/img/title-style.svg" alt="" /> Преимущества
              </h2>
              <p>
                Жилой комплекс «Örleu» — это новый проект комфорт+ класса от
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
            </div>
          </div>
        </div>

        <div className="section section4 mt-10 !h-auto">
          <div className="info !p-0">
            <SendRequest />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OreluMobileHeader;
