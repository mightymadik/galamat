"use client";

import { useEffect, useRef } from "react";

function Map() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = "objects-office";

    const initMap = () => {
      const ymaps = (window as any).ymaps;

      const map = new ymaps.Map(mapRef.current, {
        center: [51.121967, 71.366154],
        zoom: 13,
        controls: [],
      });

      const smallPlacemark = new ymaps.Placemark(
        [51.121967, 71.366154],
        {
          hintContent: "ЖК Galaxy Star",
        },
        {
          iconLayout: "default#image",
          iconImageHref: "/img/map-marker.svg",
          iconImageSize: [40, 70],
        },
      );

      map.geoObjects.add(smallPlacemark);
    };

    const loadScript = () => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://api-maps.yandex.ru/2.1/?apikey=2eb83824-2f70-443e-ae10-085950e599f1&lang=ru_RU";
      script.type = "text/javascript";
      script.onload = () => {
        if ((window as any).ymaps) {
          (window as any).ymaps.ready(initMap);
        }
      };
      document.body.appendChild(script);
    };

    if (typeof window !== "undefined") {
      if (!document.getElementById(scriptId)) {
        loadScript();
      } else {
        const interval = setInterval(() => {
          if ((window as any).ymaps?.ready) {
            clearInterval(interval);
            (window as any).ymaps.ready(initMap);
          }
        }, 100);
      }
    }
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%" }}
      className="rounded-[27px] overflow-hidden h-[400px] sm:h-[617px]"
    />
  );
}

export default Map;
