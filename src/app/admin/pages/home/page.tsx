"use client";

import React, { useState } from "react";
import AdminMainTemplate from "@/components/layout/admin/admin-main-template";
import { SITE_URL } from "@/utils/consts";
import { Listbox, ListboxItem } from "@heroui/react";
import SliderFade from "@/components/layout/admin/pages/home/slider-fade";

function Requests() {
  const [activeKey, setActiveKey] = useState<string>("fade");
  const items = [
    {
      key: "fade",
      label: "Слайдер Fade",
      component: <SliderFade slider="fade-slider" />,
    },
    {
      key: "slider-carousel",
      label: "Слайдер Carousel",
      component: <SliderFade slider="slider-carousel" />,
    },
  ];

  const selectedItem = items.find((item) => item.key === activeKey);

  return (
    <AdminMainTemplate
      pathname={`/${SITE_URL.ADMIN_PAGES}/${SITE_URL.ADMIN_PAGES_HOME}`}
    >
      <div className="w-full grid grid-cols-12 gap-4 mt-6">
        <Listbox
          items={items}
          onAction={(key) => setActiveKey(key as string)}
          className="col-span-3 border border-black/20 rounded-[12px] p-2 "
        >
          {(item) => (
            <ListboxItem
              key={item.key}
              className="text-black py-2"
              endContent={
                <i className="fa-regular fa-chevron-right text-black/30 text-[14px]"></i>
              }
            >
              {item.label}
            </ListboxItem>
          )}
        </Listbox>

        <div className="col-span-9 border rounded-[12px] p-4">
          <h2 className="font-medium text-[18px] mb-4">
            {selectedItem?.label}
          </h2>

          {selectedItem?.component}
        </div>
      </div>
    </AdminMainTemplate>
  );
}

export default Requests;
