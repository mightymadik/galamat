"use client";
import { useEffect, useRef, useState } from "react";
import { Map } from "@/types/map";
import { useTranslations } from "next-intl";

let ymapsLoader: Promise<any> | null = null;

export default function MapClient({ mapData, onModalClose }: { mapData: Map[]; onModalClose?: () => void; }) {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Map | null>(null);
    const [showMapModal, setShowMapModal] = useState(false);
    const t = useTranslations();

    const loadYmaps = () => {
        if (typeof window !== "undefined" && (window as any).ymaps) {
            return Promise.resolve((window as any).ymaps);
        }
        if (ymapsLoader) return ymapsLoader;

        const existingScript = document.querySelector(
            'script[src*="api-maps.yandex"]'
        ) as HTMLScriptElement | null;

        ymapsLoader = new Promise((resolve) => {
            if (existingScript) {
                existingScript.addEventListener("load", () =>
                    resolve((window as any).ymaps)
                );
            } else {
                const script = document.createElement("script");
                script.src =
                    "https://api-maps.yandex.ru/2.1/?apikey=ТВОЙ_KEY&lang=ru_RU&load=package.full";
                script.async = true;
                script.onload = () => resolve((window as any).ymaps);
                document.body.appendChild(script);
            }
        });

        return ymapsLoader;
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1025) {
                setShowMapModal(true);
            } else {
                setShowMapModal(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        loadYmaps().then((ymaps: any) => {
            ymaps.ready(() => {
                if (!mapInstance.current) {
                    mapInstance.current = new ymaps.Map(mapRef.current, {
                        center: [51.12617603488404, 71.42791271209718],
                        zoom: 12,
                        controls: ["zoomControl"],
                    });
                } else {
                    mapInstance.current.geoObjects.removeAll();
                }

                mapData.forEach((item) => {
                    const CustomLayout = ymaps.templateLayoutFactory.createClass(`
            <div style="display:inline-flex;align-items:center;background:white;border-radius:36px;gap:8px;padding-block:2px;padding-right:12px;padding-left:0px;width:fit-content;font-weight:500;font-size:12px;cursor:pointer;">
              <div style="display:flex;align-items:center;padding:6px;background:#2655af;border-radius:36px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 10.1433C4 5.64588 7.58172 2 12 2C16.4183 2 20 5.64588 20 10.1433C20 14.6055 17.4467 19.8124 13.4629 21.6744C12.5343 22.1085 11.4657 22.1085 10.5371 21.6744C6.55332 19.8124 4 14.6055 4 10.1433Z" stroke="#FFFF" stroke-width="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="#FFF" stroke-width="1.5"/>
                </svg>
              </div>
              <span style="white-space: nowrap;">${item.complexName}</span>
            </div>
          `);

                    const HintLayout = ymaps.templateLayoutFactory.createClass(
                        `
            <div style="display:flex;flex-direction:column;gap:8px;border-radius:24px;overflow:hidden;width:350px;background:#fff;font-family:sans-serif;font-size:13px;box-shadow:0px 4px 8px rgba(34,60,80,0.2);">
              <img src="${item.complexHeroImage || "/img/project.jpg"}" style="width:100%;height:200px;object-fit:cover;border-radius:24px 24px 0 0;" />
              <div style="display:flex;justify-content:space-between;align-items:center;padding-inline:8px;padding-block:6px;">
                <span style="font-weight:500;font-size:22px;">${item.complexName}</span>
                <span style="padding:4px 12px;background:#f4f5f9;border-radius:16px;font-size:12px;">${item.complexClass}</span>
              </div>
              <div style="margin:0 auto;height:1px;background:#e5e7eb;width:95%"></div>
              <div style="padding-inline:8px;padding-bottom:24px;">${item.complexAddress}</div>
            </div>
          `,);

                    const placemark = new ymaps.Placemark(
                        [item.complexLocation.lat, item.complexLocation.lng],
                        {},
                        {
                            hintLayout: HintLayout,
                            iconLayout: CustomLayout,
                            iconShape: { type: "Rectangle", coordinates: [[0, 0], [220, 50]] },
                        }
                    );

                    placemark.events.add("click", () => {
                        if (window.innerWidth < 1025) {
                            setSelectedItem(item);
                            setIsModalOpen(true);
                        } else {
                            window.location.href = `/project/${item.projectSlug}`;
                        }
                    });

                    mapInstance.current.geoObjects.add(placemark);
                });
            });
        });
    }, [mapData]);

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const closeMapModal = () => {
        setShowMapModal(false);
        if (onModalClose) {
            onModalClose();
        }
    };

    return (
        <>
            <div
                ref={mapRef}
                style={{
                    width: "100%",
                    height: "500px",
                    borderRadius: "12px",
                    display: showMapModal ? 'none' : 'block'
                }}
            />

            {showMapModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'white',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div
                        style={{
                            padding: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #eee',
                            backgroundColor: '#1A3C7E',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px',
                        }}
                    >
                        <h3
                            style={{
                                color: '#fff',
                                fontSize: '20px',
                                fontWeight: '400',
                                fontFamily: 'Gotham',
                                margin: '0'
                            }}
                        >{t("map_projects")}</h3>
                        <button
                            onClick={closeMapModal}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                cursor: 'pointer',
                                color: '#1A3C7E',
                                paddingInline: '10px',
                                backgroundColor: '#ECF0F8',
                                borderRadius: '50%',
                            }}
                        >
                            &times;
                        </button>
                    </div>
                    <div
                        ref={mapRef}
                        style={{
                            flex: 1,
                            width: "100%",
                            height: "100%"
                        }}
                    />
                </div>
            )}

            {isModalOpen && selectedItem && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backdropFilter: "blur(8px)",
                        backgroundColor: "#00000000",
                        animation: "fadeBg .35s ease forwards"
                    }}
                    onClick={closeModal}
                >
                    <style>
                        {`
        @keyframes fadeBg {
          from { background-color: #00000000; }
          to   { background-color: #00000080; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: .3;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}
                    </style>

                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            padding: '24px',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            animation: "slideUp .45s cubic-bezier(.25,.8,.25,1) forwards"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '16px' }}>
                            <img
                                src={selectedItem.complexHeroImage || "/img/project.jpg"}
                                alt={selectedItem.complexName}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    borderRadius: '16px',
                                    marginBottom: '16px'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h2 style={{ fontWeight: 500, fontSize: '22px' }}>{selectedItem.complexName}</h2>
                                <span style={{ padding: '4px 12px', background: '#f4f5f9', borderRadius: '16px', fontSize: '12px' }}>
                                    {selectedItem.complexClass}
                                </span>
                            </div>
                            <div style={{ height: '1px', background: '#e5e7eb', margin: '16px 0' }}></div>
                            <p>{selectedItem.complexAddress}</p>
                        </div>

                        <div className="flex flex-row gap-2">
                            <button
                                onClick={() => {
                                    window.location.href = `/project/${selectedItem.projectSlug}`;
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#2655af',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '24px',
                                    fontSize: '14px',
                                    fontWeight: 400,
                                    cursor: 'pointer'
                                }}
                            >
                                {t("go_project")}
                            </button>
                            <button
                                onClick={closeModal}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgb(244 245 249)',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '24px',
                                    fontSize: '14px',
                                    fontWeight: 400,
                                    cursor: 'pointer'
                                }}
                            >
                                {t("close")}
                            </button>
                        </div>
                    </div>
                </div >
            )
            }
        </>
    );
}