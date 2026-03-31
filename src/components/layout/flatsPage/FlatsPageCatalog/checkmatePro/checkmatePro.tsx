"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Select, SelectItem } from "@heroui/select";
import { createPortal } from "react-dom";
import { Spinner } from "@heroui/react";
import { FlatsFilterParams } from "@/types/flat";
import type { RealEstateType } from "@/types/flat";
import { useTranslations } from "next-intl";
import { getFlatsForChessboard, getFlatsMetadata } from "@/app/(pages)/flats/actions";

// Тип карточки квартиры (как в checkmate — данные из /api/properties)
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
    apartmentNumber?: number | string;
    numberApartmentFloor?: number;
    priceNum?: number;
    priceM2Num?: number;
    areaNum?: number;
    district?: string;
    hypothec?: boolean;
    installment?: boolean;
}

const toSafeNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// Адаптер из ответа /api/properties (та же логика, что и в checkmate)
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

    // Статус продажи закрыт → квартира серая и недоступная
    const saleStatusRaw = String(property.saleStatus ?? "").trim().toLowerCase();
    const saleStatusClosed = ["закрыто", "closed", "продано", "sold"].includes(saleStatusRaw);
    const statusMap: Record<string, string> = {
        свободно: "available",
        бронь: "reserved",
        забронировано: "reserved",
        закрыто: "sold",
    };
    const rawStatus = String(property.propertyStatus ?? property.status ?? "").trim().toLowerCase();
    let available = saleStatusClosed ? "unavailable" : (statusMap[rawStatus] ?? "unavailable");
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

const PortalTooltip = ({ visible, flat, position, unavailable = false }: {
    visible: boolean;
    flat: ComponentFlat;
    position: { x: number; y: number } | null;
    unavailable?: boolean;
}) => {
    const t = useTranslations();
    if (!visible || !position) return null;

    return createPortal(
        <>
            <div
                className="fixed w-[190px] z-50"
                style={{ left: `${position.x}px`, top: `${position.y}px`, transform: "translateX(-50%)" }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="190" height="103" viewBox="0 0 190 103" fill="none" className="absolute top-0 left-0">
                    <path d="M91.1119 101.44C93.1802 103.52 96.534 103.52 98.6023 101.44L108.76 91.2236H176.76C184.072 91.2236 190 85.2611 190 77.9062V13.3173C190 5.96236 184.072 0 176.76 0H13.2404C5.92794 0 0 5.96236 0 13.3173V77.9062C0.000134208 85.2611 5.92802 91.2236 13.2404 91.2236H80.9553L91.1119 101.44Z" fill="white" stroke="rgba(0,0,0,0.19)" strokeWidth="0.6" />
                </svg>
                <div className="absolute top-0 left-0 w-[190px] h-[103px] flex flex-col justify-center items-center p-[10px]">
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
                            <h1 className="text-[#000] text-[20px] font-normal leading-none">{flat.price}</h1>
                            <span className="text-[#000] text-[16px] font-normal leading-none">{flat.area}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

interface CheckmateProProps {
    filterParams?: FlatsFilterParams;
    onTotalCountChange?: (count: number) => void;
    onProjectChange?: (project: string | null) => void;
    realEstateType?: RealEstateType;
    detailBasePath?: string;
}

export default function CheckmatePro({
    filterParams = {},
    onTotalCountChange,
    onProjectChange,
    realEstateType = "property",
    detailBasePath = "/flats",
}: CheckmateProProps) {
    const t = useTranslations();

    const selectedComplex = filterParams.project ?? null;

    const [flats, setFlats] = useState<ComponentFlat[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [complexes, setComplexes] = useState<string[]>([]);
    const complexOptions = Array.from(new Set([...(complexes || []), ...(selectedComplex ? [selectedComplex] : [])]));
    const [loading, setLoading] = useState(false);
    const [hoveredFlat, setHoveredFlat] = useState<ComponentFlat | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

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

    useEffect(() => {
        if (!flats.length || !onTotalCountChange) return;
        const freeMatchingCount = flats.filter((f) => flatMatchesFilters(f, filterParams) && f.available === "available").length;
        onTotalCountChange(freeMatchingCount);
    }, [flats, filterParams, onTotalCountChange]);

    const statusColors: Record<string, string> = {
        available: "#132C5E",
        reserved: "#F5A012",
        sold: "#CE2532",
        unavailable: "#A7A7A7",
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
                            {isClient && hoveredFlat && (
                                <PortalTooltip
                                    visible={hoveredFlat.available === "available" || hoveredFlat.available === "reserved"}
                                    flat={hoveredFlat}
                                    position={tooltipPosition}
                                    unavailable={!flatMatchesFilters(hoveredFlat, filterParams)}
                                />
                            )}

                            {(() => {
                                const allFloors = [...new Set(flats.map((flat) => toSafeNumber(flat.floor)))]
                                    .filter((n) => Number.isFinite(n))
                                    .sort((a, b) => b - a);

                                return (
                                    <>
                                        <div className="flex flex-col items-end gap-[11px] h-full">
                                            <div className="flex p-[10px] justify-center items-center gap-[10px] self-stretch">
                                                <p className="text-[#BBBABA] text-center text-[16px] not-italic font-normal leading-[100%]">Этаж</p>
                                            </div>
                                            <div className="flex flex-col justify-end gap-[16px] flex-[1_0_0] self-stretch">
                                                {allFloors.map((floorNumber, index) => (
                                                    <div key={index} className="flex h-[72px] p-[6.184px] flex-col justify-center items-center gap-[6.184px] self-stretch">
                                                        {floorNumber}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-row items-end gap-[24px] overflow-x-auto pb-[32px] pr-[50px] [&::-webkit-scrollbar]:h-[14px] [&::-webkit-scrollbar-track]:bg-[#E5E5E5] [&::-webkit-scrollbar-thumb]:bg-[#132C5E] [&::-webkit-scrollbar-thumb]:rounded-[4px] hover:[&::-webkit-scrollbar-thumb]:bg-[#1f417c]">
                                            {[...new Set(flats.map((flat) => toSafeNumber(flat.entrance)))]
                                                .filter((n) => Number.isFinite(n))
                                                .sort((a, b) => a - b)
                                                .map((entranceNumber) => {
                                                    const entranceFlats = flats.filter((flat) => toSafeNumber(flat.entrance) === entranceNumber);
                                                    return (
                                                        <div key={entranceNumber} className="flex flex-col items-center gap-[16px] h-full">
                                                            <div className="flex px-[24px] py-[10px] justify-center items-center gap-[10px] self-stretch rounded-[12px] bg-[#F4F6FB] lg:bg-[#FFF]">
                                                                <span className="flex-[1_0_0] text-[#1E1E1E] text-center text-[16px] font-normal leading-[100%]">
                                                                    {t("entrance")} {entranceNumber}
                                                                </span>
                                                            </div>
                                                            <div className="flex h-full pr-[6px] flex-col justify-end gap-[16px] self-stretch">
                                                                {allFloors.map((floorNumber, index) => {
                                                                    const flatsOnFloor = entranceFlats
                                                                        .filter((flat) => toSafeNumber(flat.floor) === floorNumber)
                                                                        .sort((a, b) => {
                                                                            const na = Number(a.numberApartmentFloor ?? 0);
                                                                            const nb = Number(b.numberApartmentFloor ?? 0);
                                                                            if (na !== nb) return na - nb;
                                                                            return toSafeNumber(a.apartmentNumber) - toSafeNumber(b.apartmentNumber);
                                                                        });
                                                                    return (
                                                                        <div key={index} className="flex min-h-[72px] items-center gap-[8px] self-stretch">
                                                                            {flatsOnFloor.map((flat) => {
                                                                                const matchesFilter = flatMatchesFilters(flat, filterParams);
                                                                                const isUnavailableStatus = flat.available !== "available" && flat.available !== "reserved";
                                                                                const bgColor = statusColors[flat.available] ?? "#A7A7A7";
                                                                                return (
                                                                                    <Link
                                                                                        key={flat.id}
                                                                                        href={`${detailBasePath}/${flat.documentId ?? flat.id}`}
                                                                                        onMouseEnter={(e) => {
                                                                                            setHoveredFlat(flat);
                                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                                            setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 110 });
                                                                                        }}
                                                                                        onMouseLeave={() => {
                                                                                            setHoveredFlat(null);
                                                                                            setTooltipPosition(null);
                                                                                        }}
                                                                                        className={`flex h-[72px] w-[100px] px-[9px] py-[8px] flex-col justify-start items-start gap-[8px] rounded-[8px] ${isUnavailableStatus ? "border-[0.791px] border-solid border-[#E5E7EB]" : ""}`}
                                                                                        style={{ backgroundColor: bgColor, opacity: matchesFilter ? 1 : 0.5 }}
                                                                                    >
                                                                                        <div className="flex flex-col items-start gap-[4px]">
                                                                                            <span className="text-[#FFF] text-[12px] not-italic font-normal leading-[100%]">{flat.room} {t("rooms_count")}</span>
                                                                                            <span className="text-[#FFF] text-[12px] not-italic font-normal leading-[100%]">{flat.area}</span>
                                                                                        </div>
                                                                                        {flat.available === "available" && (
                                                                                            <div className="flex flex-col items-start">
                                                                                                <span className="text-[#FFF] text-[11px] not-italic font-normal leading-[100%]">{flat.price}</span>
                                                                                                <span className="text-[#FFF] text-[8px] not-italic font-normal leading-[100%]">{flat.priceM2}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </Link>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
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
        </div>
    );
}
