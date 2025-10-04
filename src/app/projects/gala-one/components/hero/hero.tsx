import Link from "next/link";
import "./_gala-banner.scss";
import { Button } from "@heroui/react";
import React from "react";
import { useDispatch } from "react-redux";
import { setModalSendRequestGalaOne } from "@/redux/modals";

function GalaOneHero() {
  const dispatch = useDispatch();
  return (
    <div className="gala-banner">
      <div className="wrapper">
        <div
          className="banner-info"
          style={{ backgroundImage: `url(/img/gala-banner-img.webp)` }}
        >
          <img src="/img/gala-logo.svg" alt="" className="gala-logo" />
          <h1>Gala One</h1>
          <p>
            Твоя точка на карте лучшего района. Пересечение Ұлы Дала и Туран
          </p>
          <div className="buttons flex-js-c gap-4">
            <Link
              href="https://drive.google.com/drive/folders/1eCSC1OcSQemkB8eaj9Uk1TzGjBh7H1Uw?usp=sharing"
              target="_blank"
            >
              <Button className="red-btn bg-[#FF002B]">Скачать буклет</Button>
            </Link>
            <Button
              className="blue-btn"
              onPress={() => dispatch(setModalSendRequestGalaOne(" "))}
            >
              Оставить заявку
            </Button>
          </div>
          <div className="address">
            <span>
              <img src="/img/addr-icon1.svg" alt="" />
              Срок сдачи: III квартал 2026 года
            </span>
            <Link
              href="https://go.2gis.com/JCf5N"
              target="_blank"
              className="text-white flex-js-c gap-2 mt-2 text-[13px] font-medium"
            >
              <img src="/img/addr-icon2.svg" alt="" />
              г.Астана, р-н Нура, проспект Улы Дала 40
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GalaOneHero;
