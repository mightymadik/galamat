import "./_max-slider.scss";
import SliderFacade from "@/app/projects/gala-one/components/max-slider/slider-facade";
import { useState } from "react";
import clsx from "clsx";
import SliderYard from "@/app/projects/gala-one/components/max-slider/slider-yard";
import SliderHalls from "@/app/projects/gala-one/components/max-slider/slider-hall";
import ViewTop from "@/app/projects/gala-one/components/max-slider/view-top";

const tabs = [
  {
    name: "Фасад",
    component: <SliderFacade />,
  },
  {
    name: "Двор",
    component: <SliderYard />,
  },
  {
    name: "Холлы",
    component: <SliderHalls />,
  },
  {
    name: "Вид сверху",
    component: <ViewTop />,
  },
];

function MaxSlider() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="banner-slider-wrap banner-slider-wrap2 mt-10">
      <div className="wrapper">
        <div className="gala-tabs">
          {tabs.map((tab, i) => (
            <div
              key={`slider-rab-max-${i}`}
              className={clsx("gala-tab-item", {
                active: activeTab === i,
              })}
              onClick={() => setActiveTab(i)}
            >
              {tab.name}
            </div>
          ))}
        </div>

        {tabs[activeTab].component}
      </div>
    </div>
  );
}

export default MaxSlider;
