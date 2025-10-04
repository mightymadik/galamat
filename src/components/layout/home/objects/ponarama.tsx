"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css"; // մի մոռացիր style-ը
import "@photo-sphere-viewer/markers-plugin/index.css";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";

export default function PhotoSphereViewer() {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewerRefHome = useRef<HTMLDivElement | null>(null);
  const viewerRefRoom = useRef<HTMLDivElement | null>(null);

  const [activeMarker, setActiveMarker] = useState(0);

  useEffect(() => {
    if (!viewerRef.current) {
      return;
    }

    const viewer = new Viewer({
      container: viewerRef.current,
      panorama: "/img/360/360.jpg",
      caption: "Улица",
      navbar: ["zoom", "fullscreen"],
      plugins: [
        [
          MarkersPlugin,
          {
            defaultHoverScale: false,
            markers: [
              {
                id: "login",
                position: { pitch: -0.5, yaw: -0.29 },
                image: "/img/marker.png",
                size: { width: 50, height: 50 },
                anchor: "bottom center",
                tooltip: "Галамат",
              },
            ],
          },
        ],
      ],
    });

    const markersPlugin = viewer.getPlugin(MarkersPlugin);

    markersPlugin?.addEventListener("select-marker", () => {
      setActiveMarker(1);
    });

    return () => {
      viewer.destroy(); // մաքրում ենք ռեսուրսները կոմպոնենտը փակելիս
    };
  }, [viewerRef, activeMarker]);

  useEffect(() => {
    if (!viewerRefHome.current) {
      return;
    }

    const viewer = new Viewer({
      container: viewerRefHome.current,
      panorama: "/img/360/home.jpg",
      caption: "Галамат",
      plugins: [
        [
          MarkersPlugin,
          {
            defaultHoverScale: false,
            markers: [
              {
                id: "room",
                position: { pitch: 0, yaw: -1.7 },
                image: "/img/marker.png",
                size: { width: 50, height: 50 },
                anchor: "bottom center",
                tooltip: "Мангилик Ел",
              },
              {
                id: "logout",
                position: { pitch: 0, yaw: 0 },
                image: "/img/marker.png",
                size: { width: 50, height: 50 },
                anchor: "bottom center",
                tooltip: "Улица",
              },
            ],
          },
        ],
      ],
    });

    const markersPlugin = viewer.getPlugin(MarkersPlugin);

    markersPlugin.addEventListener("select-marker", ({ marker }) => {
      if (marker.config.id === "logout") {
        setActiveMarker(0);
      }
      if (marker.config.id === "room") {
        setActiveMarker(2);
      }
    });

    return () => {
      viewer.destroy();
    };
  }, [viewerRefHome, activeMarker]);

  useEffect(() => {
    if (!viewerRefRoom.current) {
      return;
    }

    const viewer = new Viewer({
      container: viewerRefRoom.current,
      panorama: "/img/360/room.jpg",
      caption: "Мангилик Ел",
      plugins: [
        [
          MarkersPlugin,
          {
            defaultHoverScale: false,
            markers: [
              {
                id: "login",
                position: { pitch: 0, yaw: 1.7 },
                image: "/img/marker.png",
                size: { width: 50, height: 50 },
                anchor: "bottom center",
                tooltip: "Галамат",
              },
            ],
          },
        ],
      ],
    });

    const markersPlugin = viewer.getPlugin(MarkersPlugin);

    markersPlugin.addEventListener("select-marker", ({ marker }) => {
      if (marker.config.id === "login") {
        setActiveMarker(1);
      }
    });

    return () => {
      viewer.destroy();
    };
  }, [viewerRefRoom, activeMarker]);

  return (
    <div className="w-full relative rounded-[12px] overflow-hidden">
      {activeMarker === 0 && (
        <div ref={viewerRef} style={{ width: "100%", height: "500px" }} />
      )}
      {activeMarker === 1 && (
        <div ref={viewerRefHome} style={{ width: "100%", height: "500px" }} />
      )}
      {activeMarker === 2 && (
        <div ref={viewerRefRoom} style={{ width: "100%", height: "500px" }} />
      )}
    </div>
  );
}
