import "./_information-block.scss";
import { useState } from "react";
import clsx from "clsx";

function InformationBlock() {
  const [openOneItem, setOpenOneItem] = useState(false);
  const [openTwoItem, setOpenTwoItem] = useState(false);
  const [openTreehItem, setOpenTreehItem] = useState(false);

  return (
    <div
      className="information-block"
      style={{ backgroundImage: "url(/img/information-bg.png)" }}
    >
      <div className="wrapper">
        <div className="info">
          <div className="info-item">
            <div
              className="top cursor-pointer"
              onClick={() => setOpenOneItem(!openOneItem)}
            >
              <div
                className={clsx(
                  "icon flex-jc-c text-white text-[35px] cursor-pointer",
                  {
                    "pb-[2px]": openOneItem,
                  },
                )}
              >
                {openOneItem ? "-" : "+"}
              </div>
              <span>Комфортный двор</span>
            </div>
            <ul
              className={clsx("transition max-[767px]:!opacity-100", {
                "opacity-0": !openOneItem,
              })}
            >
              <li>
                <span className="circle"></span>
                <span className="text">Закрытый двор</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Зоны отдыха</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Детские площадки</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Спортивные зоны</span>
              </li>
            </ul>
          </div>
          <div className="info-item">
            <div
              className="top cursor-pointer"
              onClick={() => setOpenTwoItem(!openTwoItem)}
            >
              <div
                className={clsx(
                  "icon flex-jc-c text-white text-[35px] cursor-pointer",
                  {
                    "pb-[2px]": openTwoItem,
                  },
                )}
              >
                {openTwoItem ? "-" : "+"}
              </div>
              <span>Современные решения</span>
            </div>
            <ul
              className={clsx("transition max-[767px]:!opacity-100", {
                "opacity-0": !openTwoItem,
              })}
            >
              <li>
                <span className="circle"></span>
                <span className="text">Face ID</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Smart замки</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Видеонаблюдение</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Стильные холлы</span>
              </li>
            </ul>
          </div>
          <div className="info-item">
            <div
              className="top"
              onClick={() => setOpenTreehItem(!openTreehItem)}
            >
              <div
                className={clsx(
                  "icon flex-jc-c text-white text-[35px] cursor-pointer",
                  {
                    "pb-[2px]": openTreehItem,
                  },
                )}
              >
                {openTreehItem ? "-" : "+"}
              </div>
              <span>Простор и надёжность</span>
            </div>
            <ul
              className={clsx("transition max-[767px]:!opacity-100", {
                "opacity-0": !openTreehItem,
              })}
            >
              <li>
                <span className="circle"></span>
                <span className="text">Кирпичный фасад</span>
              </li>
              <li>
                <span className="circle"></span>
                <span className="text">Потолки 3 метра</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InformationBlock;
