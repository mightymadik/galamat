"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Select, SelectItem } from "@heroui/select";
import { createPortal } from "react-dom";
import { Button, Spinner } from "@heroui/react";
import { FlatsFilterParams } from "@/types/flat";
import type { RealEstateType } from "@/types/flat";
import { useTranslations } from "next-intl";
import { getFlatsForChessboard, getFlatsMetadata } from "@/app/(pages)/flats/actions";

// Тип карточки квартиры (как в list/block — данные из /api/properties)
interface ComponentFlat {
    id: number;
    documentId?: number;
    title: string;
    address: string;
    price: string;
    priceM2: string;
    tags: string[];
    images: string[];
    room: string;
    area: string;
    floor: string;
    section: string;
    entrance: string;
    deadline: string;
    available: string;
    /** Номер квартиры (для тултипа и подписей) */
    apartmentNumber?: number | string;
    /** Порядок квартиры на этаже (для сортировки в шахматке) */
    numberApartmentFloor?: number;
    /** Числовые значения для проверки соответствия фильтрам на клиенте */
    priceNum?: number;
    priceM2Num?: number;
    areaNum?: number;
    district?: string;
    hypothec?: boolean;
    installment?: boolean;
}

// Безопасно привести к числу (для этажа/секции), NaN → 0
const toSafeNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// Адаптер из ответа /api/properties в формат карточки (как в list/block)
const adaptProperty = (property: any): ComponentFlat => {
    const formattedPrice = property.priceCheckmate
        ? `${property.priceCheckmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`
        : "0 ₸";
    const formattedPriceM2 = property.priceM2Checkmate
        ? `${property.priceM2Checkmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`
        : "0 ₸/м²";
    const address = property.complexAddress || [property.district, property.projectName].filter(Boolean).join(", ") || "";
    const section = property.section != null && typeof property.section === "object"
        ? String(property.section?.id ?? property.section?.number ?? property.section?.name ?? "0")
        : (property.section != null ? String(property.section) : "0");
    const totalArea = property.totalArea != null ? Number(property.totalArea) : 0;
    const priceCheckmate = property.priceCheckmate != null ? Number(property.priceCheckmate) : 0;
    const priceM2Checkmate = property.priceM2Checkmate != null ? Number(property.priceM2Checkmate) : 0;
    const district = property.district ?? property.project?.district ?? "";

    // Статусы: saleStatus закрыт (закрыто/closed/продано/sold) → всегда недоступно (серый); иначе по propertyStatus
    const saleStatusRaw = String(property.saleStatus ?? "").trim().toLowerCase();
    const saleStatusClosed = ["закрыто", "closed", "продано", "sold"].includes(saleStatusRaw);
    const statusMap: Record<string, string> = {
        свободно: "available",
        бронь: "reserved",
        забронировано: "reserved",
        закрыто: "sold", // только propertyStatus "закрыто" → красный #CE2532
    };
    const rawStatus = String(property.propertyStatus ?? property.status ?? "").trim().toLowerCase();
    let available = saleStatusClosed ? "unavailable" : (statusMap[rawStatus] ?? "unavailable");
    // Безопасность: стоимость шахматка < 10 млн или цена за м² шахматка < 300 000 → недоступно
    if (priceCheckmate < 10_000_000 || priceM2Checkmate < 300_000) {
        available = "unavailable";
    }

    return {
        id: property.id,
        documentId: property.documentId != null ? property.documentId : undefined,
        title: property.projectName || "",
        address,
        price: formattedPrice,
        priceM2: formattedPriceM2,
        tags: property.tags || [],
        images: property.images || [],
        room: property.room?.toString() || "0",
        area: `${Number.isFinite(totalArea) ? totalArea : 0} м²`,
        floor: String(toSafeNumber(property.floor) || 0),
        section: section || "0",
        entrance: property.entrance?.toString() || "0",
        deadline: "",
        available,
        apartmentNumber: property.apartmentNumber != null ? property.apartmentNumber : property.id,
        numberApartmentFloor: property.numberApartmentFloor != null ? property.numberApartmentFloor : 0,
        priceNum: Number.isFinite(priceCheckmate) ? priceCheckmate : undefined,
        priceM2Num: Number.isFinite(priceM2Checkmate) ? priceM2Checkmate : undefined,
        areaNum: Number.isFinite(totalArea) ? totalArea : undefined,
        district: typeof district === "string" ? district : "",
        hypothec: property.hypothec === true || property.hypothec === "true",
        installment: property.installment === true || property.installment === "true",
    };
};

// Проверка соответствия квартиры текущим фильтрам (для раскраски «Недоступно» в шахматке)
function flatMatchesFilters(flat: ComponentFlat, filterParams: FlatsFilterParams): boolean {
    if (filterParams.priceRange?.length === 2 && flat.priceNum != null) {
        if (flat.priceNum < filterParams.priceRange[0] || flat.priceNum > filterParams.priceRange[1]) return false;
    }
    if (filterParams.pricePerM2Range?.length === 2 && flat.priceM2Num != null) {
        if (flat.priceM2Num < filterParams.pricePerM2Range[0] || flat.priceM2Num > filterParams.pricePerM2Range[1]) return false;
    }
    if (filterParams.areaRange?.length === 2 && flat.areaNum != null) {
        if (flat.areaNum < filterParams.areaRange[0] || flat.areaNum > filterParams.areaRange[1]) return false;
    }
    if (filterParams.entranceRange?.length === 2) {
        const ent = toSafeNumber(flat.entrance);
        if (ent < filterParams.entranceRange[0] || ent > filterParams.entranceRange[1]) return false;
    }
    if (filterParams.roomCount?.length) {
        if (!flat.room || !filterParams.roomCount.includes(flat.room)) return false;
    }
    if (filterParams.district && filterParams.district !== "Все" && flat.district !== undefined) {
        if (flat.district !== filterParams.district) return false;
    }
    if (filterParams.tags?.length) {
        const hasMatch = filterParams.tags.some((t) => flat.tags?.includes(t));
        if (!hasMatch) return false;
    }
    return true;
}

// Portal-based Tooltip component
const PortalTooltip = ({ visible, flat, position, unavailable = false }: {
    visible: boolean;
    flat: ComponentFlat;
    position: { x: number; y: number } | null;
    unavailable?: boolean;
}) => {
    if (!visible || !position) return null;
    const t = useTranslations();
    /** Цена только для свободных и брони; продано/недоступно — без цены */
    const showPrice = flat.available === "available" || flat.available === "reserved";
    return createPortal(
        <><div
            className="fixed w-[190px] z-50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)'
            }}
        >
            {/* SVG-хвостик + фон */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="190"
                height="103"
                viewBox="0 0 190 103"
                fill="none"
                className="absolute top-0 left-0"
            >
                <path
                    d="M91.1119 101.44C93.1802 103.52 96.534 103.52 98.6023 101.44L108.76 91.2236H176.76C184.072 91.2236 190 85.2611 190 77.9062V13.3173C190 5.96236 184.072 0 176.76 0H13.2404C5.92794 0 0 5.96236 0 13.3173V77.9062C0.000134208 85.2611 5.92802 91.2236 13.2404 91.2236H80.9553L91.1119 101.44Z"
                    fill="white"
                    stroke="rgba(0,0,0,0.19)"
                    strokeWidth="0.6" />
            </svg>

            {/* Контент тултипа */}
            <div className="absolute top-0 left-0 w-[190px] h-[103px] flex flex-col justify-start items-center p-[10px]">
                <div className="flex flex-col items-start gap-[8px] w-full">
                    <div className="flex items-center gap-[4px] w-full">
                        <div className="flex items-center gap-[8px] flex-1">
                            <div className="flex h-[24px] px-[8px] justify-center items-center rounded-[8px] bg-[#132C5E] text-white text-[14px] font-normal leading-none">
                                {flat.room} {t("rooms_count")}
                            </div>
                            <span className="text-[#000] text-[16px] font-normal leading-none">№{flat.apartmentNumber ?? flat.id}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-[2px] w-full">
                        {showPrice && (
                            <h1 className="text-[#000] text-[20px] font-normal leading-none">{flat.price}</h1>
                        )}
                        <span className="text-[#000] text-[16px] font-normal leading-none">{flat.area}</span>
                    </div>
                </div>
            </div>
        </div>
        </>,
        document.body
    );
};

interface CheckmateProps {
    filterParams?: FlatsFilterParams;
    onTotalCountChange?: (count: number) => void;
    onProjectChange?: (project: string | null) => void;
    realEstateType?: RealEstateType;
    detailBasePath?: string;
}

export default function Checkmate({
    filterParams = {},
    onTotalCountChange,
    onProjectChange,
    realEstateType = "property",
    detailBasePath = "/flats",
}: CheckmateProps) {
    const t = useTranslations();

    const selectedComplex = filterParams.project ?? null;

    const [mobileDrawerFlat, setMobileDrawerFlat] = useState<ComponentFlat | null>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [flats, setFlats] = useState<ComponentFlat[]>([]);
    const [hoveredFlat, setHoveredFlat] = useState<ComponentFlat | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [complexes, setComplexes] = useState<string[]>([]);
    const complexOptions = Array.from(new Set([...(complexes || []), ...(selectedComplex ? [selectedComplex] : [])]));
    const [isDesktop, setIsDesktop] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getFlatsMetadata()
            .then((meta: { complexes?: string[] }) => {
                if (cancelled) return;
                setComplexes(meta.complexes || []);
            })
            .catch(() => {
                if (!cancelled) setComplexes([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedComplex) {
            setFlats([]);
            return;
        }
        setLoading(true);
        let cancelled = false;
        getFlatsForChessboard({ project: selectedComplex })
            .then((items: any[]) => {
                if (cancelled) return;
                const adapted = items.map(adaptProperty);
                setFlats(adapted);
                const freeMatchingCount = adapted.filter((f: ComponentFlat) => flatMatchesFilters(f, filterParams) && f.available === "available").length;
                if (onTotalCountChange) onTotalCountChange(freeMatchingCount);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setFlats([]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedComplex, onTotalCountChange]);

    // При смене фильтров пересчитываем количество свободных квартир, подходящих под фильтры
    useEffect(() => {
        if (!flats.length || !onTotalCountChange) return;
        const freeMatchingCount = flats.filter((f) => flatMatchesFilters(f, filterParams) && f.available === "available").length;
        onTotalCountChange(freeMatchingCount);
    }, [flats, filterParams, onTotalCountChange]);

    useEffect(() => {
        setIsClient(true);
        setIsDesktop(window.innerWidth >= 1024);
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleOpenDrawer = (flat: ComponentFlat) => {
        setMobileDrawerFlat(flat);
        // ждём один тик для анимации появления
        setTimeout(() => setDrawerVisible(true), 10);
    };

    const handleCloseDrawer = () => {
        setDrawerVisible(false);
        setTimeout(() => setMobileDrawerFlat(null), 500); // совпадает с duration-500
    };

    return (
        <div className="w-full h-full">
            {!selectedComplex && (
                <div className="flex w-full h-full flex-col items-center gap-8">
                    <h1 className="text-[#282D3C] text-center [font-size:_clamp(20px,5vw,32px)] not-italic font-bold leading-[normal]">
                        {t("select_complex_to_see_the_chessboard_layout_of_the_house")}
                    </h1>
                    <Select
                        className="max-w-xs"
                        label={t("select_complex")}
                        selectedKeys={selectedComplex ? [selectedComplex] : []}
                        onSelectionChange={(keys: any) => {
                            const selection = Array.from(keys)[0];
                            const next = (selection as string) || null;
                            if (onProjectChange) onProjectChange(next);
                        }}
                    >
                        {complexOptions.map((title) => (
                            <SelectItem key={title}>{title}</SelectItem>
                        ))}
                    </Select>
                </div>
            )}
            {selectedComplex && (
                <div className="relative flex gap-[17px] w-full h-full min-h-[200px]">
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-10 rounded-[24px]">
                            <Spinner size="lg" color="primary" />
                            <span className="text-[#132C5E] font-medium">{t("loading_chessboard")}</span>
                        </div>
                    )}
                    {!loading && flats.length === 0 && (
                        <div className="flex flex-1 items-center justify-center py-12">
                            <p className="text-[#666] text-center">{t("no_flats_selected_complex")}</p>
                        </div>
                    )}
                    {!loading && flats.length > 0 && (
                        <>
                            {/* Render portal tooltip */}
                            {isClient && hoveredFlat && (
                                <PortalTooltip
                                    visible
                                    flat={hoveredFlat}
                                    position={tooltipPosition}
                                    unavailable={!flatMatchesFilters(hoveredFlat, filterParams)}
                                />
                            )}

                            {/* Общий список этажей по всем квартирам — чтобы ряды совпадали во всех колонках */}
                            {(() => {
                                const allFloors = [...new Set(flats.map(flat => toSafeNumber(flat.floor)))]
                                    .filter((n) => Number.isFinite(n))
                                    .sort((a, b) => b - a); // сверху вниз: от верхнего этажа к первому

                                return (
                                    <>
                                        {/* Левая колонка с этажами */}
                                        <div className="flex flex-col items-end gap-[11px] h-full">
                                            <div className="flex p-[10px] justify-center items-center gap-[10px] self-stretch">
                                                <p className="text-[#BBBABA] text-center text-[16px] not-italic font-normal leading-[100%]">Этаж</p>
                                            </div>

                                            <div className="flex flex-col justify-end gap-[16px] flex-[1_0_0] self-stretch">
                                                {allFloors.map((floorNumber, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex h-[34px] p-[6.184px] flex-col justify-center items-center gap-[6.184px] self-stretch"
                                                    >
                                                        {floorNumber}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Правая часть — подъезды (те же этажи, чтобы ряды совпадали) */}
                                        <div
                                            className="flex flex-row items-end gap-[24px] overflow-x-auto pb-[32px] pr-[50px] [&::-webkit-scrollbar]:h-[14px] [&::-webkit-scrollbar-track]:bg-[#E5E5E5] [&::-webkit-scrollbar-thumb]:bg-[#132C5E] [&::-webkit-scrollbar-thumb]:rounded-[4px] hover:[&::-webkit-scrollbar-thumb]:bg-[#1f417c]"
                                        >
                                            {[...new Set(flats.map(flat => toSafeNumber(flat.entrance)))]
                                                .filter((n) => Number.isFinite(n))
                                                .sort((a, b) => a - b)
                                                .map((entranceNumber) => {
                                                    const entranceFlats = flats.filter(flat => toSafeNumber(flat.entrance) === entranceNumber);

                                                    return (
                                                        <div
                                                            key={entranceNumber}
                                                            className="flex flex-col items-center gap-[16px] h-full"
                                                        >
                                                            {/* Верхняя плашка с номером подъезда */}
                                                            <div className="flex px-[24px] py-[10px] justify-center items-center gap-[10px] self-stretch rounded-[12px] bg-[#F4F6FB] lg:bg-[#FFF]">
                                                                <span className="flex-[1_0_0] text-[#1E1E1E] text-center text-[16px] font-normal leading-[100%]">
                                                                    {t("entrance")} {entranceNumber}
                                                                </span>
                                                            </div>

                                                            {/* Этажи: тот же порядок, что и в левой колонке */}
                                                            <div className="flex h-full pr-[6px] flex-col justify-end gap-[16px] self-stretch">
                                                                {allFloors.map((floorNumber, index) => {
                                                                    const flatsOnFloor = entranceFlats
                                                                        .filter(flat => toSafeNumber(flat.floor) === floorNumber)
                                                                        .sort((a, b) => {
                                                                            const na = Number(a.numberApartmentFloor ?? 0);
                                                                            const nb = Number(b.numberApartmentFloor ?? 0);
                                                                            if (na !== nb) return na - nb;
                                                                            return toSafeNumber(a.apartmentNumber) - toSafeNumber(b.apartmentNumber);
                                                                        });

                                                                    return (
                                                                        <div
                                                                            key={index}
                                                                            className="flex w-full h-[34px] justify-start gap-[8px] flex-shrink-0"
                                                                        >
                                                                            {flatsOnFloor.map((flat) => {
                                                                                // Свободно — синий, бронь — оранжевый; propertyStatus закрыто — красный; saleStatus закрыто и остальные — серый «Недоступно»
                                                                                const matchesFilter = flatMatchesFilters(flat, filterParams);
                                                                                const isUnavailableStatus = flat.available !== "available" && flat.available !== "reserved";
                                                                                const statusColors: Record<string, string> = {
                                                                                    available: "#132C5E",
                                                                                    reserved: "#F5A012",
                                                                                    sold: "#CE2532", // закрыто, проданные и т.д.
                                                                                    unavailable: "#A7A7A7",
                                                                                };
                                                                                const bgColor = statusColors[flat.available] ?? "#A7A7A7";

                                                                                return (
                                                                                    isDesktop ? (
                                                                                        <Link
                                                                                            key={flat.id}
                                                                                            href={`${detailBasePath}/${flat.documentId ?? flat.id}`}
                                                                                            onMouseEnter={(e) => {
                                                                                                setHoveredFlat(flat);
                                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                                setTooltipPosition({
                                                                                                    x: rect.left + rect.width / 2,
                                                                                                    y: rect.top - 110,
                                                                                                });
                                                                                            }}
                                                                                            onMouseLeave={() => {
                                                                                                setHoveredFlat(null);
                                                                                                setTooltipPosition(null);
                                                                                            }}
                                                                                            className={`group relative flex w-[34px] h-[34px] p-[4px] justify-center items-center 
    rounded-[4px] text-[#FFF] text-[18.8px] font-normal leading-[100%]
    transition-all duration-200 ${isUnavailableStatus ? "border-[0.791px] border-solid border-[#E5E7EB]" : ""}`}
                                                                                            style={{ backgroundColor: bgColor, opacity: matchesFilter ? 1 : 0.5 }}
                                                                                        >
                                                                                            {flat.room}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <div
                                                                                            key={flat.id}
                                                                                            onClick={(e) => {
                                                                                                if (window.innerWidth < 1025) {
                                                                                                    e.preventDefault(); // не переходить по ссылке на мобиле
                                                                                                    if (flat.available !== "available") return;
                                                                                                    setMobileDrawerFlat(flat);
                                                                                                    handleOpenDrawer(flat);
                                                                                                }
                                                                                            }}
                                                                                            className={`group relative flex w-[34px] h-[34px] p-[4px] justify-center items-center 
    rounded-[4px] text-[#FFF] text-[18.8px] font-normal leading-[100%]
    transition-all duration-200 ${isUnavailableStatus ? "border-[0.791px] border-solid border-[#E5E7EB]" : ""}`}
                                                                                            style={{ backgroundColor: bgColor, opacity: matchesFilter ? 1 : 0.5 }}
                                                                                        >
                                                                                            {flat.room}
                                                                                        </div>
                                                                                    )

                                                                                );
                                                                            })}

                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Нижняя плашка с номером подъезда */}
                                                            <div className="flex px-[24px] py-[10px] justify-center items-center gap-[10px] self-stretch rounded-[12px] bg-[#F4F6FB] lg:bg-[#FFF]">
                                                                <span className="flex-[1_0_0] text-[#1E1E1E] text-center text-[16px] font-normal leading-[100%]">
                                                                    {t("entrance")} {entranceNumber}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </div>
            )}
            {/* Drawer для мобильных */}
            {mobileDrawerFlat && (
                <div
                    className="fixed inset-0 z-60 flex flex-col justify-end bg-black/40 lg:hidden"
                    onClick={() => handleCloseDrawer()}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex w-full flex-col items-start gap-[24px] bg-white px-[16px] py-[24px] rounded-t-[24px] transform transition-transform duration-500 ease-in-out ${drawerVisible ? "translate-y-0" : "translate-y-full"
                            }`}
                        style={{ maxHeight: "75vh" }}
                    >
                        {/* Заголовок */}
                        <div className="flex items-start gap-[32px] self-stretch">
                            <h1 className="flex-[1_0_0] text-[#122C5E] text-[24px] font-normal">
                                {mobileDrawerFlat.room} комнатная
                            </h1>
                            <Button
                                className="flex max-w-[32px] max-h-[32px] p-[10px] items-center gap-[10px] [aspect-ratio:1/1] rounded-[16px] bg-[#F4F6FB]"
                                onClick={() => handleCloseDrawer()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 12 12">
                                    <path
                                        d="M10.6464 0.146447C10.8417 -0.0488153 11.1582 -0.0488155 11.3535 0.146447C11.5487 0.341712 11.5487 0.658228 11.3535 0.853478L6.45699 5.74996L11.3535 10.6464C11.5487 10.8417 11.5487 11.1582 11.3535 11.3535C11.1582 11.5487 10.8417 11.5487 10.6464 11.3535L5.74996 6.45699L0.853478 11.3535C0.658228 11.5487 0.341712 11.5487 0.146447 11.3535C-0.0488155 11.1582 -0.0488155 10.8417 0.146447 10.6464L5.04293 5.74996L0.146447 0.853478C-0.0488155 0.658216 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658216 -0.0488155 0.853478 0.146447L5.74996 5.04293L10.6464 0.146447Z"
                                        fill="#122C5E"
                                    />
                                </svg>
                            </Button>
                        </div>

                        {/* Контент */}
                        <div className="flex flex-col gap-[16px] self-stretch">
                            <div className="flex items-center gap-[8px]">
                                <div className="flex h-[36px] p-[11px] justify-center items-center rounded-[12px] bg-[#1A3C7E]">
                                    <span className="text-white text-[12px] font-medium">№{mobileDrawerFlat.apartmentNumber ?? mobileDrawerFlat.id}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-[2px]">
                                <h1 className="text-[#000] text-[24px] font-normal">{mobileDrawerFlat.price}</h1>
                                <span className="text-[#000] text-[16px]">{mobileDrawerFlat.area}</span>
                            </div>
                        </div>

                        {/* Кнопка */}
                            <div className="flex flex-col justify-end items-end gap-[12px] self-stretch">
                            <Link
                                href={`${detailBasePath}/${mobileDrawerFlat.documentId ?? mobileDrawerFlat.id}`}
                                className="flex text-white h-[44px] p-[13px] justify-center items-center self-stretch rounded-[12px] bg-[#1A3C7E]"
                            >
                                Подробнее
                            </Link>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}