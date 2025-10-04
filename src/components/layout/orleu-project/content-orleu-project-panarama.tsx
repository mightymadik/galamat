"use client";

import React, { useEffect, useRef } from "react";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import { Viewer } from "@photo-sphere-viewer/core";

function ContentOrleuProjectAlPanorama() {
  const PRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!PRef.current) {
      return;
    }

    const viewer = new Viewer({
      container: PRef.current,
      panorama: "/img/360/orleu-1.jpg",
      caption: "Orleu",
      navbar: ["zoom", "fullscreen"],
    });

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div className="w-full relative z-[10000]">
      <h3 className="px-4 block lg:hidden text-[30px] text-blue mb-4 text-end font-bold">
        360°
      </h3>
      <div className="px-4 lg:px-[80px] w-full relative cursor-pointer !rounded-[20px] overflow-hidden">
        <div
          // ref={PRef}
          style={{ width: "100%", height: "100%" }}
          className="rounded-[20px] overflow-hidden"
        >
          <iframe
            width="100%"
            height="640"
            frameBorder="0"
            allow="xr-spatial-tracking; gyroscope; accelerometer"
            allowFullScreen
            scrolling="no"
            className="rounded-[8px]"
            src="https://kuula.co/share/hCJx3?logo=1&info=0&logosize=110&fs=1&vr=0&thumbs=3&inst=0"
          />
        </div>
      </div>
    </div>
  );
}

export default ContentOrleuProjectAlPanorama;
