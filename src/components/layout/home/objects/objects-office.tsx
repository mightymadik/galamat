"use client";

import { useEffect, useRef } from "react";

function ObjectsOffice() {
  const mapRef = useRef<HTMLDivElement>(null);
  const isOpenedRef = useRef(false);

  useEffect(() => {
    const scriptId = "objects-office";

    const initMap = () => {
      const ymaps = window.ymaps;

      const map = new ymaps.Map(mapRef.current, {
        center: [51.128943, 71.490211],
        zoom: 13,
        controls: [],
      });

      // ✅ Custom HTML Layout (Visual only — not interactive via DOM)
      const CardLayout = ymaps.templateLayoutFactory.createClass(`
        <div class="project-card" style="cursor: pointer;">
          <div class="project-card-header">
            <h2 class="project-title">ЖК ORLEU</h2>
            <h3 class="project-price">от 13,560,000</h3>
          </div>
          <div class="project-image-wrapper">
            <img
              src="img/project-orleu.png"
              class="project-image"
              alt="Project Title"
              style="width: 100%; border-radius: 8px;"
            />
          </div>
        </div>
      `);

      // ✅ Initial Small Icon Placemark
      const smallPlacemark = new ymaps.Placemark(
        [51.128943, 71.490211],
        {
          hintContent: "ЖК ORLEU",
        },
        {
          iconLayout: "default#image",
          iconImageHref: "/img/icons/map-icon.svg",
          iconImageSize: [40, 70],
        },
      );

      // ✅ On click, replace icon with Card Placemark
      smallPlacemark.events.add("click", () => {
        if (isOpenedRef.current) {
          return;
        }
        isOpenedRef.current = true;

        map.geoObjects.remove(smallPlacemark);

        const cardPlacemark = new ymaps.Placemark(
          [51.128943, 71.490211],
          {
            hintContent: "ЖК ORLEU",
          },
          {
            iconLayout: "default#imageWithContent",
            iconImageHref: "", // transparent background
            iconImageSize: [300, 320],
            iconContentOffset: [0, 0],
            iconContentLayout: CardLayout,
            iconShape: {
              type: "Rectangle",
              coordinates: [
                [0, 0],
                [300, 320],
              ],
            },
          },
        );

        // ✅ Add real click handler through Yandex API
        cardPlacemark.events.add("click", () => {
          window.open("/orleu-project", "_blank");
        });

        map.geoObjects.add(cardPlacemark);
      });

      map.geoObjects.add(smallPlacemark);
    };

    const loadScript = () => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://api-maps.yandex.ru/2.1/?apikey=2eb83824-2f70-443e-ae10-085950e599f1&lang=ru_RU";
      script.type = "text/javascript";
      script.onload = () => {
        if (window.ymaps) {
          window.ymaps.ready(initMap);
        }
      };
      document.body.appendChild(script);
    };

    if (typeof window !== "undefined") {
      if (!document.getElementById(scriptId)) {
        loadScript();
      } else {
        const interval = setInterval(() => {
          if (window.ymaps && window.ymaps.ready) {
            clearInterval(interval);
            window.ymaps.ready(initMap);
          }
        }, 100);
      }
    }
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%" }}
      className="rounded-[8px] overflow-hidden h-[400px] sm:h-[631px]"
    />
  );
}

export default ObjectsOffice;
