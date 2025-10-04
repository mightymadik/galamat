import "./objects.scss";
import { useState } from "react";
import clsx from "clsx";

import OurObjects from "@/components/layout/home/objects/our-objects";
import { useTranslate } from "@/hooks/useTranslate";
import ObjectsOffice from "@/components/layout/home/objects/objects-office";

function Objects() {
  const $t = useTranslate();
  const [activeTab, setActiveTab] = useState(0);

  const tabContents = [
    {
      name: "360°",
      content: (
        <iframe
          width="100%"
          height="640"
          frameBorder="0"
          allow="xr-spatial-tracking; gyroscope; accelerometer"
          allowFullScreen
          scrolling="no"
          className="rounded-[8px] h-[400px] sm:h-[631px]"
          src="https://kuula.co/share/collection/7D5Ns?logo=1&info=0&logosize=110&fs=0&vr=0&autop=10&thumbs=-1&inst=ru"
        />
      ),
      // content: <PhotoSphereViewer />,
    },
    {
      name: $t("office_"),
      content: <OurObjects height={500} />,
    },
    {
      name: $t("objects_"),
      content: <ObjectsOffice />,
    },
  ];

  return (
    <div className="wrapper md:!mb-12 !mt-10 md:!mt-[100px]">
      <div className="tabs">
        <div className="tab-buttons gap-0 !mr-[15px] min-[425px]:mr-5">
          {tabContents.map((tab, index) => (
            <button
              key={`tab-${index}`}
              className={clsx("tab-btn mr-[-10px] sm:mr-0", {
                active: activeTab === index,
              })}
              onClick={() => setActiveTab(index)}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="tab-content active !p-2 sm:!p-4">
          {tabContents[activeTab].content}
        </div>
      </div>
    </div>
  );
}

export default Objects;
