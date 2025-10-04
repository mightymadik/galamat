import { useEffect, useRef } from "react";

function Map() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = "objects-office";

    const initMap = () => {
      const ymaps = window.ymaps;

      const map = new ymaps.Map(mapRef.current, {
        center: [51.099676, 71.381358],
        zoom: 13,
        controls: [],
      });

      // ✅ Initial Small Icon Placemark
      const smallPlacemark = new ymaps.Placemark(
        [51.099676, 71.381358],
        {
          hintContent: "ЖК Gala One",
        },
        {
          iconLayout: "default#image",
          iconImageHref: "/img/icons/map-icon.svg",
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
    <div className="wrapper !mt-10">
      <div
        ref={mapRef}
        style={{ width: "100%" }}
        className="rounded-[27px] overflow-hidden h-[400px] sm:h-[617px]"
      />
    </div>
  );
}

export default Map;
