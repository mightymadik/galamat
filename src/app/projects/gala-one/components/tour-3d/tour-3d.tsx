import "./_tour-3d.scss";
import Facade from "@/app/projects/gala-one/components/tour-3d/facade";
import Construction from "@/app/projects/gala-one/components/tour-3d/construction";
import { useState } from "react";
import clsx from "clsx";

function Tour3d() {
  const [zIndex, setZIndex] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeItem, setActiveItem] = useState(0);

  const tabsTour = [
    {
      name: "Тур",
      component: <Facade onChangeZIndex={(res: boolean) => setZIndex(res)} />,
      maxLength: 1,
    },
    {
      name: "Ход строительства",
      component: <Construction activeIndex={activeItem} />,
      maxLength: 2,
    },
  ];

  return (
    <>
      <div
        className={clsx("tour-3d mt-10 relative", {
          "!z-[1000]": zIndex,
        })}
      >
        <div className="tab-cont-wrap">
          <div className="wrapper">
            <div className="tab-content active !rounded-[12px] sm:!rounded-[16px]">
              <div className="img-wrap">{tabsTour[activeTab].component}</div>
            </div>
          </div>
        </div>
        <div className="wrapper h-[60px] !mt-[-60px]">
          <div className="w-full h-full flex-jsb-c bg-white relative rounded-[0_0_12px_12px] sm:!rounded-[0_0_16px_16px] px-2 sm:px-6">
            <div className="tabs">
              <div className="tab-buttons max-[576px]:!gap-0">
                {tabsTour.map((item, index) => (
                  <button
                    key={`key-tour-${index}`}
                    className={clsx("tab-btn max-[576px]:!px-2", {
                      active: activeTab === index,
                    })}
                    onClick={() => {
                      setActiveTab(index);
                      setActiveItem(0);
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Tour3d;
