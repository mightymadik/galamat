import "./_tour-3d.scss";
import Facade from "@/app/projects/gala-one/components/tour-3d/facade";
import { useState } from "react";
import clsx from "clsx";

function Tour3d() {
  const [zIndex, setZIndex] = useState<boolean>(false);

  // const [activeTab, setActiveTab] = useState(0);
  // const [activeItem, setActiveItem] = useState(0);
  //
  // const tabsTour = [
  //   {
  //     name: "Фасад",
  //     component: <Facade />,
  //     maxLength: 1,
  //   },
  //   {
  //     name: "Двор",
  //     component: <Yard activeIndex={activeItem} />,
  //     maxLength: 3,
  //   },
  //   {
  //     name: "Холлы",
  //     component: <Halls activeIndex={activeItem} />,
  //     maxLength: 2,
  //   },
  // ];

  // function Next() {
  //   if (activeItem <= tabsTour[activeTab].maxLength - 1) {
  //     setActiveItem(activeItem + 1);
  //   }
  // }
  //
  // function Prev() {
  //   if (activeItem >= 0) {
  //     setActiveItem(activeItem - 1);
  //   }
  // }

  return (
    <div
      className={clsx("tour-3d mt-10 relative", {
        "!z-[1000]": zIndex,
      })}
    >
      <div className="tab-cont-wrap">
        <div className="wrapper">
          <div className="tab-content active !rounded-[12px] sm:!rounded-[16px]">
            <div className="img-wrap">
              <Facade onChangeZIndex={(res) => setZIndex(res)} />
            </div>
          </div>
        </div>
      </div>
      <div className="wrapper h-[60px] !mt-[-60px]">
        {/*<div className="w-full h-full flex-jsb-c bg-white relative rounded-[0_0_12px_12px] sm:!rounded-[0_0_16px_16px] px-2 sm:px-6">*/}
        {/*  <div className="tabs">*/}
        {/*    <div className="tab-buttons max-[576px]:!gap-0">*/}
        {/*      {tabsTour.map((item, index) => (*/}
        {/*        <button*/}
        {/*          key={`key-tour-${index}`}*/}
        {/*          className={clsx("tab-btn max-[576px]:!px-2", {*/}
        {/*            active: activeTab === index,*/}
        {/*          })}*/}
        {/*          onClick={() => {*/}
        {/*            setActiveTab(index);*/}
        {/*            setActiveItem(0);*/}
        {/*          }}*/}
        {/*        >*/}
        {/*          {item.name}*/}
        {/*        </button>*/}
        {/*      ))}*/}
        {/*    </div>*/}
        {/*  </div>*/}

        {/*  {tabsTour[activeTab].maxLength > 1 ? (*/}
        {/*    <div className="arrows">*/}
        {/*      <button*/}
        {/*        type="button"*/}
        {/*        onClick={Prev}*/}
        {/*        disabled={activeItem === 0}*/}
        {/*        className={clsx({*/}
        {/*          "opacity-70": activeItem === 0,*/}
        {/*        })}*/}
        {/*      >*/}
        {/*        <img*/}
        {/*          src="/img/gala-slider-arr.svg"*/}
        {/*          alt=""*/}
        {/*          className="transform rotate-180"*/}
        {/*        />*/}
        {/*      </button>*/}
        {/*      <button*/}
        {/*        type="button"*/}
        {/*        onClick={Next}*/}
        {/*        disabled={activeItem === tabsTour[activeTab].maxLength - 1}*/}
        {/*        className={clsx({*/}
        {/*          "opacity-70":*/}
        {/*            activeItem === tabsTour[activeTab].maxLength - 1,*/}
        {/*        })}*/}
        {/*      >*/}
        {/*        <img src="/img/gala-slider-arr.svg" alt="" />*/}
        {/*      </button>*/}
        {/*    </div>*/}
        {/*  ) : null}*/}
        {/*</div>*/}
      </div>
    </div>
  );
}

export default Tour3d;
