"use client";

import React from "react";

function ContentOrleuProjectMap() {
  return (
    <div className="section section7 !h-auto relative z-[1000]">
      <div className="map-info">
        <h2 className="main-title">Все нужное рядом</h2>
        <div className="map-block overflow-hidden rounded-[12px] lg:rounded-[20px]">
          <iframe
            src="https://yandex.ru/map-widget/v1/?um=constructor%3A1d06dce74a1235d4701ed508a8b1e077e36e90310f7e85c9dc3d5648e49be5d7&amp;source=constructor"
            width="100%"
            height="720"
            frameBorder="0"
            className="h-[50dvh] lg:h-[70dvh]"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectMap;
