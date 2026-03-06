"use client";
import { useState, useEffect } from "react";
import { Switch } from "@heroui/switch";
import { Button } from "@heroui/button";
import Image from "next/image";
import { ProjectGenPlanDataItem, ProjectPropertyPointsDataItem, ProjectAttractionPointsDataItem } from "@/types/projectPage";
import { useTranslations } from "next-intl";

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
    // apartments: { text: string[]; available: string[]; price: string[] };
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
    }, [planData]);

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
        // apartments: {
        //     text: ["1-комнатные", "2-комнатные", "3-комнатные", "4-комнатные"],
        //     available: ["3 доступно", "2 доступно", "1 доступно", "0 доступно"],
        //     price: ["от 25 млн ₸", "от 35 млн ₸", "от 45 млн ₸", "от 55 млн ₸"]
        // }
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
                {genPlan === true && (
                    <div className="w-full rounded-[0px] lg:rounded-[32px] overflow-x-auto lg:overflow-x-hidden overflow-y-hidden scrollbar-hide">
                        <div className="relative w-[1320px] h-[800px]">
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
                                                    <svg className='min-w-[16px] min-h-[15px]' xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M10.3703 1.92771C10.3703 2.99235 9.04374 3.85541 7.40736 3.85541C5.77098 3.85541 4.44443 2.99235 4.44443 1.92771C4.44443 0.863064 5.77098 0 7.40736 0C9.04374 0 10.3703 0.863064 10.3703 1.92771Z" fill="black" fillOpacity="0.4" />
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M5.54568 5.60361C5.78251 5.59526 6.01085 5.59035 6.22219 5.59035C6.87891 5.59035 7.58971 5.63783 8.22963 5.69763C10.0329 5.86614 11.3983 6.73191 11.944 7.79693C12.0675 8.03813 12.4424 8.18499 12.8279 8.14319L14.9649 7.91147C15.4491 7.85896 15.9071 8.07179 15.9878 8.38684C16.0685 8.70189 15.7413 8.99985 15.2571 9.05236L13.1202 9.28408C11.8718 9.41944 10.6576 8.94382 10.2574 8.16269C9.89325 7.45189 9.02149 6.94012 7.97689 6.8425C7.65963 6.81286 7.33667 6.78778 7.02296 6.77077L6.7016 8.86155C6.60208 9.50903 6.59048 9.67994 6.65765 9.83267C6.72483 9.9854 6.87365 10.1264 7.48458 10.6417L12.7338 15.0684C13.0336 15.3213 12.9616 15.6844 12.573 15.8795C12.1843 16.0746 11.6261 16.0278 11.3262 15.7749L6.07702 11.3482C6.0487 11.3243 6.02069 11.3007 5.993 11.2774C5.50633 10.8678 5.12125 10.5436 4.9485 10.1509C4.77576 9.75815 4.83899 9.35056 4.9189 8.83542C4.92345 8.80612 4.92805 8.77647 4.93266 8.74646L5.23379 6.78732C3.25062 6.99833 1.77779 8.21138 1.77779 9.63854C1.77779 9.95793 1.37983 10.2169 0.888912 10.2169C0.397998 10.2169 3.2718e-05 9.95793 3.2718e-05 9.63854C3.2718e-05 7.60233 2.26822 5.71917 5.54568 5.60361ZM4.61875 11.3847C5.10013 11.4473 5.41232 11.752 5.31605 12.0652C4.89228 13.4437 3.73496 14.6809 2.04764 15.5592L1.44419 15.8732C1.06085 16.0728 0.501485 16.0323 0.194814 15.7829C-0.111858 15.5335 -0.0497061 15.1696 0.333634 14.9701L0.937085 14.656C2.29778 13.9478 3.23107 12.9501 3.57281 11.8384C3.66909 11.5252 4.13737 11.3221 4.61875 11.3847Z" fill="black" fillOpacity="0.4" />
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
                                            <div className="inline-flex p-[24px] flex-col justify-center items-center gap-[10px] rounded-[24px] bg-[rgba(0,_0,_0,_0.21)] backdrop-filter backdrop-blur-lg w-[200px]">
                                                <div className="flex flex-col items-start gap-[16px] text-white text-[12px] leading-[12px]">
                                                    <div className="flex flex-col gap-[14px]">
                                                        <span className="text-[16px] font-medium">{item.name}</span>

                                                        {item.district && (
                                                            <p className="opacity-80">{item.district}</p>
                                                        )}
                                                    </div>
                                                    {[
                                                        { label: t('gen_plan_addres'), value: item.address },
                                                        { label: t('gen_plan_floor'), value: item.floors },
                                                        { label: t('gen_plan_date'), value: item.date },
                                                        { label: t('gen_plan_type_home'), value: item.material },
                                                    ].map(
                                                        (row) =>
                                                            row.value && (
                                                                <div key={row.label} className="flex flex-col gap-[6px]">
                                                                    <span className="opacity-60">{row.label}</span>
                                                                    <span className="font-medium">{row.value}</span>
                                                                </div>
                                                            )
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {tour === true && (
                    <iframe src={planData?.complexTour} width="100%" height="800px" className="rounded-[32px]" />
                )}
                {tourProgress === true && (
                    <iframe src={planData?.complexTourProgress} width="100%" height="800px" className="rounded-[32px]" />
                )}
                {activeProperty && (
                    <div
                        key={activeProperty.id}
                        className={`flex lg:hidden overflow-y-hidden fixed left-0 bottom-0 transform transition-transform duration-500 ease-in-out z-60 w-full p-[24px] flex-col justify-center items-center gap-[10px] rounded-t-[24px] bg-[rgba(0,_0,_0,_0.62)] backdrop-filter backdrop-blur-lg
      ${isDrawerOpen ? "translate-y-0" : "translate-y-full"}`}
                    >
                        <div className="flex flex-col items-start gap-[22px]">
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

                            <div className="flex justify-between items-start self-stretch">
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {t('gen_plan_address')}
                                </span>
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {activeProperty.address}
                                </span>
                            </div>
                            <div className="flex justify-between items-start self-stretch">
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {t('gen_plan_floor')}
                                </span>
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {activeProperty.floors}
                                </span>
                            </div>
                            <div className="flex justify-between items-start self-stretch">
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {t('gen_plan_date')}
                                </span>
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {activeProperty.date}
                                </span>
                            </div>
                            <div className="flex justify-between items-start self-stretch">
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {t('gen_plan_type_home')}
                                </span>
                                <span className="text-[#FFF] text-[12px] font-medium leading-[12px]">
                                    {activeProperty.material}
                                </span>
                            </div>
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