"use client";
import { useState, useEffect } from "react";
import { Switch } from "@heroui/switch";
import { Button } from "@heroui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
    ProjectGenPlanDataItem,
    ProjectPropertyPointsDataItem,
    ProjectAttractionPointsDataItem,
    GenPlanApartmentPreviewRow,
} from "@/types/projectPage";

/** Общая высота блока: генплан, тур, ход строительства (svh — корректнее на мобилке с адресной строкой). */
const GEN_PLAN_MAIN_STAGE_CLASS =
    "h-[min(65svh,800px)] min-h-[220px] max-h-[800px] w-full overflow-hidden";

interface PropertyBadge {
    id: number;
    number: string;
    coords: { x: number; y: number };
    name: string;
    floors: string;
    address: string;
    district: string;
    date: string;
    material: string;
    apartmentRows: GenPlanApartmentPreviewRow[];
}

function parseGroupedPropertyRows(
    property: ProjectPropertyPointsDataItem["property"],
    t: (key: string, values?: Record<string, number | string>) => string
): GenPlanApartmentPreviewRow[] {
    let rows: Record<string, unknown>[] = [];
    if (property == null) return [];
    if (Array.isArray(property)) {
        rows = property as Record<string, unknown>[];
    } else if (typeof property === "string") {
        try {
            const parsed = JSON.parse(property) as unknown;
            rows = Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
        } catch {
            return [];
        }
    } else {
        return [];
    }

    const out: GenPlanApartmentPreviewRow[] = [];
    for (const row of rows) {
        const title = String(
            row.title ?? row.label ?? row.name ?? row.roomType ?? row.type ?? ""
        ).trim();
        if (!title) continue;

        const planned = Boolean(row.planned ?? row.isPlanned);
        const countRaw = row.count ?? row.availableCount;
        const count = typeof countRaw === "number" ? countRaw : countRaw != null ? Number(countRaw) : NaN;
        const availableStr =
            row.available != null && String(row.available).trim() !== ""
                ? String(row.available)
                : !planned && !Number.isNaN(count) && count >= 0
                  ? t("gen_plan_available_count", { count })
                  : undefined;

        let priceFrom: string | undefined;
        if (!planned) {
            if (row.priceFrom != null && String(row.priceFrom).trim() !== "") {
                priceFrom = String(row.priceFrom);
            } else if (row.price != null && String(row.price).trim() !== "") {
                priceFrom = String(row.price);
            } else {
                const minPrice = row.minPrice ?? row.min_price;
                const n = typeof minPrice === "number" ? minPrice : minPrice != null ? Number(minPrice) : NaN;
                if (!Number.isNaN(n) && n > 0) {
                    const mln = n / 1_000_000;
                    priceFrom =
                        mln >= 1
                            ? t("gen_plan_from_mln", {
                                  n: mln % 1 < 0.05 ? Math.round(mln) : Math.round(mln * 10) / 10,
                              })
                            : `${Math.round(n).toLocaleString("ru-RU")} ₸`;
                }
            }
        }

        out.push({
            title,
            ...(planned ? { planned: true } : { available: availableStr, priceFrom }),
        });
    }
    return out;
}

function apartmentRowsForPoint(
    point: ProjectPropertyPointsDataItem,
    t: (key: string, values?: Record<string, number | string>) => string
): GenPlanApartmentPreviewRow[] {
    const fromProperty = parseGroupedPropertyRows(point.property, t);
    if (fromProperty.length > 0) return fromProperty;
    if (point.apartmentPreview?.length) return point.apartmentPreview;
    return [];
}

function GenPlanPropertyDetails({
    item,
    t,
}: {
    item: Pick<PropertyBadge, "address" | "floors" | "date" | "material" | "apartmentRows">;
    t: ReturnType<typeof useTranslations>;
}) {
    const cells = [
        { label: t("gen_plan_address"), value: item.address },
        { label: t("gen_plan_floor"), value: item.floors },
        { label: t("gen_plan_date"), value: item.date },
        { label: t("gen_plan_type_home"), value: item.material },
    ].filter((c) => c.value);

    return (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-full text-left">
                {cells.map((cell) => (
                    <div key={cell.label} className="flex flex-col gap-1.5 min-w-0">
                        <span className="opacity-60 text-[11px] leading-tight">{cell.label}</span>
                        <span className="font-medium text-[12px] leading-snug break-words">{cell.value}</span>
                    </div>
                ))}
            </div>
            {item.apartmentRows.length > 0 && (
                <>
                    <div className="w-full h-px bg-white/20 my-3 shrink-0" />
                    <div className="flex flex-col w-full">
                        {item.apartmentRows.map((row, i) => (
                            <div
                                key={`${row.title}-${i}`}
                                className="flex justify-between items-start gap-3 py-2.5 border-b border-white/[0.12] last:border-b-0"
                            >
                                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                                    <span className="font-medium text-[12px] leading-tight text-white">{row.title}</span>
                                    {row.planned ? (
                                        <span className="text-white/50 text-[11px] leading-tight">{t("gen_plan_planned")}</span>
                                    ) : row.available ? (
                                        <span className="text-white/50 text-[11px] leading-tight">{row.available}</span>
                                    ) : null}
                                </div>
                                {!row.planned && row.priceFrom ? (
                                    <span className="font-medium text-[12px] text-white shrink-0 text-right whitespace-nowrap">
                                        {row.priceFrom}
                                    </span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

interface AttractionBadge {
    id: number;
    title: string;
    time: string;
    x: number;
    y: number;
    direction: "up" | "down" | "left" | "right" | "left-top" | "left-bottom" | "right-top" | "right-bottom";
    transport: "walk" | "car";
}

export default function GenPlanClient({ genPlanData }: { genPlanData: ProjectGenPlanDataItem[] }) {
    const t = useTranslations();

    const [showBadges, setShowBadges] = useState(true);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [activeProperty, setActiveProperty] = useState<PropertyBadge | null>(null);
    const [genPlan, setGenPlan] = useState(true);
    const [tour, setTour] = useState(false);
    const [tourProgress, setTourProgress] = useState(false);

    const planData = genPlanData && genPlanData.length > 0 ? genPlanData[0] : null;

    const hasValidGenPlan =
        planData?.complexGenPlanImage &&
        !planData.complexGenPlanImage.includes("undefined");

    const showGenPlan = Boolean(hasValidGenPlan);
    const showTour = Boolean(planData?.complexTour);
    const showTourProgress = Boolean(planData?.complexTourProgress);

    useEffect(() => {
        if (!planData) return;

        if (hasValidGenPlan) {
            setGenPlan(true);
            setTour(false);
            setTourProgress(false);
        } else if (planData.complexTour) {
            setGenPlan(false);
            setTour(true);
            setTourProgress(false);
        } else if (planData.complexTourProgress) {
            setGenPlan(false);
            setTour(false);
            setTourProgress(true);
        }
    }, [planData, hasValidGenPlan]);

    const properties: PropertyBadge[] = planData?.propertyPoints.map((point: ProjectPropertyPointsDataItem) => ({
        id: point.id,
        number: point.section,
        coords: {
            x: Math.max(16, Math.min(point.x * 1320, 1304)), // Keep within 16px padding
            y: Math.max(16, Math.min(point.y * 800, 784))   // Keep within 16px padding
        },
        direction: "up",
        name: `Секция ${point.section}`,
        floors: `${point.floor} этаж${parseInt(point.floor) % 10 === 1 && parseInt(point.floor) !== 11 ? '' : 'ей'}`,
        address: `${point.address}`,
        district: `${point.district}`,
        date: `${point.date}`,
        material: `${point.material}`,
        apartmentRows: apartmentRowsForPoint(point, t),
    })) || [];

    const badges: AttractionBadge[] = planData?.attractionPoints.map(
        (point: ProjectAttractionPointsDataItem) => ({
            id: point.id,
            title: point.title,
            time: `${point.time} мин`,
            x: Math.max(16, Math.min(point.x * 1320, 1304)),
            y: Math.max(16, Math.min(point.y * 800, 784)),
            direction: point.direction as
                | "up"
                | "down"
                | "left"
                | "right"
                | "left-top"
                | "left-bottom"
                | "right-top"
                | "right-bottom",
            transport: point.transport === "car" ? "car" : "walk",
        })
    ) || [];


    const handleClick = (property: PropertyBadge) => {
        setActiveProperty(property);
        setIsDrawerOpen(true);
    };

    const getArrowRotation = (direction: string) => {
        switch (direction) {
            case "up":
                return "rotate-180";
            case "down":
                return "";
            case "left":
                return "rotate-90";
            case "right":
                return "-rotate-90";

            case "left-top":
                return "rotate-[135deg]";
            case "left-bottom":
                return "rotate-[45deg]";
            case "right-top":
                return "rotate-[-135deg]";
            case "right-bottom":
                return "-rotate-[45deg]";

            default:
                return "";
        }
    };

    return (
        <><div className="py-[40px] lg:py-[64px]">
            <div className="wrapper flex flex-col items-start gap-[32px] self-stretch !px-0 lg:!px-[16px]">
                <div className="px-[16px] lg:px-0 flex items-start gap-[16px] self-stretch flex-col lg:flex-row">
                    <h1 className="text-[#202028] text-[36px] font-medium leading-[100%] w-full max-w-[320px]">
                        {t("genplan")}
                    </h1>
                    <div className="flex md:flex-row flex-col gap-[8px] w-full">
                        {showGenPlan &&
                            <Button
                                onClick={() => {
                                    setGenPlan(true)
                                    setTour(false)
                                    setTourProgress(false)
                                }}
                                className="flex max-w-[220px] !flex-row h-[44px] pl-[12px] pr-[16px] py-[4px] flex-col justify-center items-center rounded-[32px] bg-[#ECF0F8]">
                                <Switch
                                    isSelected={showBadges}
                                    onValueChange={setShowBadges}
                                >
                                </Switch>
                                <div className="flex items-center gap-[8px] self-stretch">
                                    <p className="text-[#282D3C] text-[14px] lg:text-[16px] font-medium leading-[16px]">
                                        {t("infrastructure")}
                                    </p>
                                </div>
                            </Button>
                        }
                        {showTour &&
                            <Button
                                onClick={() => {
                                    setTour(true)
                                    setGenPlan(false)
                                    setTourProgress(false)
                                }}
                                className="flex w-full max-w-[169px] h-[44px] pl-[12px] pr-[16px] py-[4px] flex-col justify-center items-center rounded-[32px] bg-[#ECF0F8]">
                                <div className="flex justify-center items-center gap-[8px] text-[#132C5E] text-[14px] lg:text-[16px] font-medium leading-[18.423px]">
                                    {t("tour")}
                                </div>
                            </Button>
                        }
                        {showTourProgress &&
                            <Button
                                onClick={() => {
                                    setTourProgress(true)
                                    setTour(false)
                                    setGenPlan(false)
                                }}
                                className="flex w-full max-w-[190px] h-[44px] pl-[12px] pr-[16px] py-[4px] flex-col justify-center items-center rounded-[32px] bg-[#ECF0F8]">
                                <div className="flex justify-center items-center gap-[8px] text-[#132C5E] text-[14px] lg:text-[16px] font-medium leading-[18.423px]">
                                    {t("tourProgress")}
                                </div>
                            </Button>
                        }
                    </div>
                </div>
                {genPlan === true && hasValidGenPlan && (
                    <div
                        className={`rounded-[0px] lg:rounded-[32px] scrollbar-hide ${GEN_PLAN_MAIN_STAGE_CLASS} overflow-x-auto overflow-y-auto`}
                    >
                        <div className="relative h-[800px] w-[1320px] shrink-0">
                            {planData &&
                                <Image
                                    src={planData.complexGenPlanImage}
                                    alt="GenPlan"
                                    className="w-full h-full object-cover rounded-[0px] lg:rounded-[32px]"
                                    width={1320}
                                    height={800}
                                    unoptimized
                                />
                            }

                            {showBadges && planData &&
                                badges.map((badge) => (
                                    <div
                                        key={badge.id}
                                        className="absolute flex flex-col items-center gap-[8px] flex flex-row"
                                        style={{
                                            left: `${badge.x}px`,
                                            top: `${badge.y}px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    >
                                        <div
                                            className={`flex w-[32px] h-[32px] justify-center items-center rounded-[32px] p-[8px] bg-white w-full max-w-[32px] ${getArrowRotation(
                                                badge.direction
                                            )}`}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="17"
                                                height="19"
                                                viewBox="0 0 17 19"
                                                fill="none"
                                            >
                                                <path
                                                    d="M7.62626 17.8433C8.07364 18.2906 8.79908 18.2906 9.24646 17.8433L16.5374 10.5524C16.9846 10.105 16.9846 9.37954 16.5374 8.93217C16.09 8.48491 15.3646 8.48494 14.9172 8.93217L9.58242 14.2669L9.5819 -5.29572e-05L7.29082 -5.27043e-05L7.2903 14.2669L1.95554 8.93217C1.50816 8.48494 0.782705 8.48491 0.335335 8.93217C-0.111922 9.37954 -0.111901 10.105 0.335335 10.5524L7.62626 17.8433Z"
                                                    fill="#DB1D31" />
                                            </svg>
                                        </div>

                                        <div className="flex px-[14px] py-[8px] flex-col justify-center items-start gap-[10px] rounded-[32px] bg-white shadow-md z-10">
                                            <div className="flex justify-center items-center gap-[8px]">
                                                <span className="text-[#1E1E1E] text-center text-[12px] font-medium leading-[12px]">
                                                    {badge.title}
                                                </span>
                                                {badge.transport == "car" &&
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="22"
                                                        height="18"
                                                        viewBox="0 0 22 18"
                                                        fill="none"
                                                    >
                                                        <path
                                                            opacity="0.4"
                                                            d="M4.00024 10.0002H7.00024M1.00024 6.00024L3.00024 7.00024L4.27089 3.18832C4.53316 2.4015 4.6643 2.00809 4.90753 1.71723C5.12232 1.46038 5.39816 1.26157 5.70975 1.13902C6.0626 1.00024 6.47729 1.00024 7.30667 1.00024H14.6938C15.5232 1.00024 15.9379 1.00024 16.2907 1.13902C16.6023 1.26157 16.8782 1.46038 17.093 1.71723C17.3362 2.00809 17.4673 2.4015 17.7296 3.18832L19.0002 7.00024L21.0002 6.00024M15.0002 10.0002H18.0002M5.80024 7.00024H16.2002C17.8804 7.00024 18.7205 7.00024 19.3622 7.32722C19.9267 7.61484 20.3856 8.07379 20.6733 8.63827C21.0002 9.28001 21.0002 10.1201 21.0002 11.8002V14.5002C21.0002 14.9649 21.0002 15.1972 20.9618 15.3904C20.804 16.1838 20.1838 16.804 19.3904 16.9618C19.1972 17.0002 18.9649 17.0002 18.5002 17.0002H18.0002C16.8957 17.0002 16.0002 16.1048 16.0002 15.0002C16.0002 14.7241 15.7764 14.5002 15.5002 14.5002H6.50024C6.2241 14.5002 6.00024 14.7241 6.00024 15.0002C6.00024 16.1048 5.10481 17.0002 4.00024 17.0002H3.50024C3.03559 17.0002 2.80326 17.0002 2.61006 16.9618C1.81668 16.804 1.19649 16.1838 1.03867 15.3904C1.00024 15.1972 1.00024 14.9649 1.00024 14.5002V11.8002C1.00024 10.1201 1.00024 9.28001 1.32722 8.63827C1.61484 8.07379 2.07379 7.61484 2.63827 7.32722C3.28001 7.00024 4.12009 7.00024 5.80024 7.00024Z"
                                                            stroke="black"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round" />
                                                    </svg>
                                                }
                                                {badge.transport == "walk" &&
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M3.25 10.1433C3.25 5.24427 7.15501 1.25 12 1.25C16.845 1.25 20.75 5.24427 20.75 10.1433C20.75 12.5084 20.076 15.0479 18.8844 17.2419C17.6944 19.4331 15.9556 21.3372 13.7805 22.3539C12.6506 22.882 11.3494 22.882 10.2195 22.3539C8.04437 21.3372 6.30562 19.4331 5.11556 17.2419C3.92403 15.0479 3.25 12.5084 3.25 10.1433ZM12 2.75C8.00843 2.75 4.75 6.04748 4.75 10.1433C4.75 12.2404 5.35263 14.5354 6.4337 16.526C7.51624 18.5192 9.04602 20.1496 10.8546 20.995C11.5821 21.335 12.4179 21.335 13.1454 20.995C14.954 20.1496 16.4838 18.5192 17.5663 16.526C18.6474 14.5354 19.25 12.2404 19.25 10.1433C19.25 6.04748 15.9916 2.75 12 2.75ZM12 7.75C10.7574 7.75 9.75 8.75736 9.75 10C9.75 11.2426 10.7574 12.25 12 12.25C13.2426 12.25 14.25 11.2426 14.25 10C14.25 8.75736 13.2426 7.75 12 7.75ZM8.25 10C8.25 7.92893 9.92893 6.25 12 6.25C14.0711 6.25 15.75 7.92893 15.75 10C15.75 12.0711 14.0711 13.75 12 13.75C9.92893 13.75 8.25 12.0711 8.25 10Z" fill="black" fillOpacity="0.4" />
                                                    </svg>
                                                }
                                                <span className="text-[#1E1E1E] text-center text-[12px] font-medium leading-[12px] opacity-40">
                                                    {badge.time}
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            {planData && properties.map((item, i) => (
                                <div
                                    key={item.id}
                                    className="absolute group cursor-pointer z-[10]"
                                    style={{
                                        left: `${item.coords.x}px`,
                                        top: `${item.coords.y}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                    onMouseEnter={() => setHoveredId(item.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => handleClick(item)}
                                >
                                    <div className="flex px-[14px] py-[8px] flex-col justify-center items-start gap-[10px] rounded-[32px] bg-white shadow-md transition-transform duration-200 group-hover:scale-110">
                                        <span className="text-[#000] text-center text-[12px] not-italic font-medium leading-[12px]">
                                            {item.number}
                                        </span>
                                    </div>

                                    {hoveredId === item.id && (
                                        <div
                                            className={`absolute translate-y-[10px] pointer-events-none hidden lg:block`}
                                            style={{
                                                transformOrigin: "center",
                                            }}
                                        >
                                            <div className="inline-flex p-[20px] flex-col items-stretch gap-[10px] rounded-[24px] bg-[rgba(0,_0,_0,_0.21)] backdrop-filter backdrop-blur-lg w-[min(320px,calc(100vw-48px))] max-w-[320px]">
                                                <div className="flex flex-col items-start gap-3 text-white text-[12px] w-full">
                                                    <div className="flex flex-col gap-2 w-full">
                                                        <span className="text-[16px] font-medium leading-tight">{item.name}</span>
                                                        {item.district && <p className="opacity-80 text-[12px] leading-snug">{item.district}</p>}
                                                    </div>
                                                    <GenPlanPropertyDetails item={item} t={t} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {tour === true && planData?.complexTour && (
                    <div className={`rounded-[0px] lg:rounded-[32px] bg-black ${GEN_PLAN_MAIN_STAGE_CLASS}`}>
                        <iframe
                            src={planData.complexTour}
                            title={t("tour")}
                            className="h-full w-full border-0 rounded-[inherit]"
                        />
                    </div>
                )}
                {tourProgress === true && planData?.complexTourProgress && (
                    <div className={`rounded-[0px] lg:rounded-[32px] bg-black ${GEN_PLAN_MAIN_STAGE_CLASS}`}>
                        <iframe
                            src={planData.complexTourProgress}
                            title={t("tourProgress")}
                            className="h-full w-full border-0 rounded-[inherit]"
                        />
                    </div>
                )}
                {activeProperty && (
                    <div
                        key={activeProperty.id}
                        className={`flex lg:hidden overflow-y-hidden fixed left-0 bottom-0 transform transition-transform duration-500 ease-in-out z-60 w-full p-[24px] flex-col justify-center items-center gap-[10px] rounded-t-[24px] bg-[rgba(0,_0,_0,_0.62)] backdrop-filter backdrop-blur-lg
      ${isDrawerOpen ? "translate-y-0" : "translate-y-full"}`}
                    >
                        <div className="flex flex-col items-start gap-[22px] w-full">
                            <div className="flex flex-col items-start gap-[24px]">
                                <span className="text-[#FFF] text-[16px] font-medium leading-[12px]">
                                    {activeProperty.name}
                                </span>
                                <div className="flex flex-col items-start gap-[8px]">
                                    <p className="text-[#FFF] text-[12px] leading-[12px] opacity-80">
                                        {activeProperty.floors} • {activeProperty.address}
                                    </p>
                                    <p className="text-[#FFF] text-[12px] leading-[12px] opacity-80">
                                        {activeProperty.district}
                                    </p>
                                </div>
                            </div>

                            <GenPlanPropertyDetails item={activeProperty} t={t} />
                        </div>
                    </div>
                )}
            </div>
        </div>
            <div
                className={`fixed inset-0 z-30 transition-opacity duration-500 ${isDrawerOpen ? "visible" : "invisible bg-transparent"}`}
                onClick={() => setIsDrawerOpen(false)} />
        </>
    );
}