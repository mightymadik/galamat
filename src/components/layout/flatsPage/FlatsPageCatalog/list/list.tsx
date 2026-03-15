"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@heroui/button"
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { openAuth } from "@/store/authSlice";
import { toggleFavorite } from "@/store/favoritesSlice";
import { FlatsFilterParams } from "../../../../../types/flat";
import { useTranslations } from "next-intl";

function FlatListCardSkeleton() {
  return (
    <div className="flex px-[24px] py-[16px] justify-center items-center gap-[24px] self-stretch rounded-[24px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full animate-pulse">
      <div className="w-[110px] h-[100px] flex-shrink-0 bg-[#F4F6FB] rounded-[12px]" />
      <div className="flex flex-col justify-center items-start gap-[8px] flex-[1_0_0]">
        <div className="flex items-center gap-[16px] w-full">
          <div className="h-6 flex-1 bg-[#F4F6FB] rounded-[8px]" />
          <div className="flex items-center gap-[4px]">
            <div className="h-6 w-16 bg-[#F4F6FB] rounded-[16px]" />
            <div className="h-6 w-20 bg-[#F4F6FB] rounded-[16px]" />
          </div>
        </div>
        <div className="flex items-center gap-[24px] self-stretch">
          <div className="flex items-center gap-[4px] flex-[1_0_0] flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                <div className="h-3 w-12 bg-[#F4F6FB] rounded-[4px] mb-1" />
                <div className="h-5 w-16 bg-[#F4F6FB] rounded-[4px]" />
              </div>
            ))}
          </div>
          <div className="w-[1px] h-[52px] bg-[#F4F6FB] opacity-20" />
          <div className="flex w-[147px] flex-col justify-center items-start gap-[4px] self-stretch">
            <div className="h-6 w-32 bg-[#F4F6FB] rounded-[4px]" />
            <div className="h-5 w-24 bg-[#F4F6FB] rounded-[4px]" />
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="h-[44px] w-[100px] bg-[#F4F6FB] rounded-[12px]" />
            <div className="w-[44px] h-[44px] bg-[#F4F6FB] rounded-[12px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlatsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
      {Array.from({ length: count }).map((_, i) => (
        <FlatListCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Define the type for flat objects that the component expects
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
}

// Adapter function to convert from property API type to component type
const adaptProperty = (property: any): ComponentFlat => {
  // Format price with currency
  const formattedPrice = property.priceCheckmate
    ? `${property.priceCheckmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`
    : "0 ₸";

  const formattedPriceM2 = property.priceM2Checkmate
    ? `${property.priceM2Checkmate.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`
    : "0 ₸/м²";

  // Используем complexAddress из complexes, если он есть, иначе формируем из district и projectName
  const address = property.complexAddress || (() => {
    const addressParts = [];
    if (property.district) addressParts.push(property.district);
    if (property.projectName) addressParts.push(property.projectName);
    return addressParts.length > 0 ? addressParts.join(", ") : "";
  })();

  return {
    id: property.id,
    documentId: property.documentId != null ? property.documentId : undefined,
    title: property.projectName || "",
    address: address,
    price: formattedPrice,
    priceM2: formattedPriceM2,
    tags: property.tags || [],
    images: property.images || [],
    room: property.room?.toString() || "0",
    area: `${property.totalArea ?? 0} м²`,
    floor: property.floor?.toString() || "0",
    section: property.section || "",
    entrance: property.entrance?.toString() || "0",
    deadline: "", // Property API не содержит deadline
    available: "1", // Все property со статусом "свободно" доступны
  };
};

interface ListProps {
  sortKey?: string;
  filterParams?: FlatsFilterParams;
  onTotalCountChange?: (count: number) => void;
}

export default function List({ sortKey = "lowestPrice", filterParams = {}, onTotalCountChange }: ListProps) {
  const t = useTranslations();
  const [flats, setFlats] = useState<ComponentFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const locale = useLocale();
  const [localeKey, setLocaleKey] = useState(locale);

  // Отслеживаем изменения locale из cookie
  useEffect(() => {
    const checkLocale = () => {
      const cookieLocale = document.cookie
        .split("; ")
        .find((row) => row.startsWith("locale="))
        ?.split("=")[1] || "ru";
      
      if (cookieLocale !== localeKey) {
        setLocaleKey(cookieLocale);
      }
    };

    checkLocale();
    const interval = setInterval(checkLocale, 500);
    return () => clearInterval(interval);
  }, [localeKey]);

  const PAGE_SIZE = 24;
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Stable key: only changes when filter content changes (prevents double fetch from reference changes)
  const filterKey = useMemo(() => JSON.stringify(filterParams), [filterParams]);

  // Сброс на первую страницу при смене фильтров/локали
  useEffect(() => {
    setCurrentPage(1);
    if (flats.length > 0) {
      setIsFadingOut(true);
      const fadeOutTimer = setTimeout(() => {
        setLoading(true);
        setIsFadingOut(false);
      }, 200);
      return () => clearTimeout(fadeOutTimer);
    } else {
      setLoading(true);
    }
  }, [filterKey, localeKey]);

  useEffect(() => {
    if (!loading) return;

    const params = new URLSearchParams();
    if (filterParams.priceRange) params.set("priceRange", filterParams.priceRange.join(","));
    if (filterParams.pricePerM2Range) params.set("pricePerM2Range", filterParams.pricePerM2Range.join(","));
    if (filterParams.areaRange) params.set("areaRange", filterParams.areaRange.join(","));
    if (filterParams.entranceRange) params.set("entranceRange", filterParams.entranceRange.join(","));
    if (filterParams.roomCount?.length) params.set("roomCount", filterParams.roomCount.join(","));
    if (filterParams.district) params.set("district", filterParams.district);
    if (filterParams.project) params.set("project", filterParams.project);
    if (filterParams.tags && filterParams.tags.length > 0) params.set("tags", filterParams.tags.join(","));
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));

    const abortController = new AbortController();
    fetch(`/api/properties?${params.toString()}`, { signal: abortController.signal })
      .then(res => res.json())
      .then((response: any) => {
        if (abortController.signal.aborted) return;
        const isPaginated = response && typeof response === "object" && "data" in response && "meta" in response;
        const items = isPaginated ? response.data : Array.isArray(response) ? response : [];
        const adaptedFlats = items.map(adaptProperty);
        setFlats(adaptedFlats);
        if (isPaginated && response.meta) {
          setTotalCount(response.meta.total ?? adaptedFlats.length);
          setCurrentPage(1);
          if (onTotalCountChange) onTotalCountChange(response.meta.total ?? 0);
        } else {
          setTotalCount(adaptedFlats.length);
          if (onTotalCountChange) onTotalCountChange(adaptedFlats.length);
        }
        setLoading(false);
      })
      .catch((error: any) => {
        if (error.name !== "AbortError") {
          console.error("Error loading properties:", error);
          setFlats([]);
          setTotalCount(0);
          setLoading(false);
        }
      });
    return () => abortController.abort();
  }, [loading, filterKey, localeKey, onTotalCountChange]);

  const handleShowMore = () => {
    if (loadingMore || flats.length >= totalCount) return;
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (filterParams.priceRange) params.set("priceRange", filterParams.priceRange.join(","));
    if (filterParams.pricePerM2Range) params.set("pricePerM2Range", filterParams.pricePerM2Range.join(","));
    if (filterParams.areaRange) params.set("areaRange", filterParams.areaRange.join(","));
    if (filterParams.entranceRange) params.set("entranceRange", filterParams.entranceRange.join(","));
    if (filterParams.roomCount?.length) params.set("roomCount", filterParams.roomCount.join(","));
    if (filterParams.district) params.set("district", filterParams.district);
    if (filterParams.project) params.set("project", filterParams.project);
    if (filterParams.tags && filterParams.tags.length > 0) params.set("tags", filterParams.tags.join(","));
    params.set("page", String(currentPage + 1));
    params.set("pageSize", String(PAGE_SIZE));

    fetch(`/api/properties?${params.toString()}`)
      .then(res => res.json())
      .then((response: any) => {
        const isPaginated = response && typeof response === "object" && "data" in response;
        const items = isPaginated ? response.data : Array.isArray(response) ? response : [];
        const adaptedFlats = items.map(adaptProperty);
        setFlats(prev => [...prev, ...adaptedFlats]);
        setCurrentPage(prev => prev + 1);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  const sortedFlats = [...flats].sort((a, b) => {
    const getNumber = (str: string) =>
      parseFloat(str.replace(/[^\d.-]/g, "")) || 0;

    switch (sortKey) {
      case "lowestPrice":
        return getNumber(a.price) - getNumber(b.price);
      case "highestPrice":
        return getNumber(b.price) - getNumber(a.price);
      case "lowestArea":
        return getNumber(a.area) - getNumber(b.area);
      case "highestArea":
        return getNumber(b.area) - getNumber(a.area);
      default:
        return 0;
    }
  });

  const hasMore = flats.length < totalCount && !loadingMore;

  // Показываем skeleton во время первой загрузки
  if (loading && flats.length === 0) {
    return (
      <div className="animate-fadeInFast w-full">
        <div className="wrapper">
          <FlatsListSkeleton count={6} />
        </div>
      </div>
    );
  }

  // Показываем fade-out для старых карточек или skeleton во время загрузки новых
  if (isFadingOut || (loading && flats.length > 0)) {
    return (
      <div className="w-full">
        <div className="wrapper">
          {flats.length > 0 && !loading && (
            <div className="flex flex-col items-start gap-[12px] self-stretch animate-fadeOut">
              {sortedFlats.map((flat, index) => (
                <FlatCard key={flat.id || index} flat={flat} />
              ))}
            </div>
          )}
          {loading && (
            <div className="animate-fadeInFast">
              <FlatsListSkeleton count={6} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (flats.length === 0) {
    return (
      <div className="animate-fadeInFast w-full">
        <div className="wrapper">
          <p className="text-center text-gray-500">{t("no_data")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-start gap-[12px] self-stretch animate-fadeIn">
        {sortedFlats.map((flat, index) => (
          <div
            key={flat.id || index}
            className="animate-fadeIn w-full"
            style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
          >
            <FlatCard flat={flat} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8 animate-fadeIn">
          <Button
            onClick={handleShowMore}
            disabled={loadingMore}
            className="flex w-[280px] h-[52px] p-[15px] justify-center items-center rounded-[32px] bg-[#F4F6FB] lg:bg-white font-medium border border-[#D1D1D1] transition-all duration-300 hover:scale-105 disabled:opacity-70"
          >
            {loadingMore ? t("loading") : `${t("show_more_flats")} ${flats.length} ${t("show_more_flats_count")} ${totalCount}`}
          </Button>
        </div>
      )}
    </>
  );
}

function FlatCard({ flat }: { flat: ComponentFlat }) {
    const t = useTranslations();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const favoriteFlatIds = useSelector((state: RootState) => state.favorites.flatIds);
    const isFavorite = favoriteFlatIds.includes(flat.id);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleLoveClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            dispatch(openAuth());
            return;
        }
        dispatch(toggleFavorite(flat.id));
    };

    const handleHover = (direction: "left" | "right") => {
        if (flat.images && flat.images.length > 1) {
            if (direction === "left") {
                setActiveIndex((prev) => (prev + 1) % flat.images.length);
            } else {
                setActiveIndex((prev) =>
                    prev === 0 ? flat.images.length - 1 : prev - 1
                );
            }
        }
    };

    const flatHref = `/flats/${flat.documentId ?? flat.id}`;
    return (
        <div className="flex px-[24px] py-[16px] justify-center items-center gap-[24px] self-stretch rounded-[24px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full transition-all duration-300 hover:shadow-lg">
            <Link href={flatHref} className="flex flex-1 min-w-0 justify-center items-center gap-[24px] self-stretch">
                {/* Изображение с наведением */}
                <div className="flex relative w-[110px] h-[100px] flex-shrink-0">
                    {flat.images && flat.images.length > 0 && flat.images[activeIndex] ? (
                        <>
                            <div
                                className="absolute left-0 top-0 h-full w-1/2 z-10 cursor-pointer"
                                onMouseEnter={() => handleHover("left")}
                            />
                            <div
                                className="absolute right-0 top-0 h-full w-1/2 z-10 cursor-pointer"
                                onMouseEnter={() => handleHover("right")}
                            />
                            <Image 
                                src={flat.images[activeIndex]} 
                                alt={flat.title} 
                                width={110} 
                                height={100}
                                className="rounded-[12px] object-contain transition-all duration-500"
                            />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-[12px] flex items-center justify-center">
                            <span className="text-gray-500 text-xs">{t("no_image")}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col justify-center items-start gap-[8px] flex-[1_0_0] min-w-0">
                    <div className="flex items-center gap-[16px]">
                        <h1 className="text-[#07071F] text-[24px] not-italic font-medium leading-[19.406px]">{flat.title}</h1>
                        <div className="flex items-center gap-[4px]">
                            {flat.tags.map((tag: string, i: number) => (
                                <div
                                    key={i}
                                    className={`flex text-[10px] p-[4px] justify-center items-center rounded-[16px] leading-full ${
                                        tag === "Ипотека" ? "bg-[#3682F5] text-[#FFF]"
                                        : tag === "Рассрочка" || tag === "Отложенный платеж" ? "bg-[#1A3C7E] text-[#FFF]"
                                        : "bg-[#F4F5F9] text-[#282D3C]"
                                    }`}
                                >
                                    {tag}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-[24px] self-stretch">
                        <div className="flex items-center gap-[4px] flex-[1_0_0] flex-wrap">
                            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("section")}</p>
                                <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.section}</span>
                            </div>
                            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("entrance")}</p>
                                <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.entrance}</span>
                            </div>
                            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("floor")}</p>
                                <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.floor}</span>
                            </div>
                            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("rooms")}</p>
                                <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.room} {t("rooms_count")}</span>
                            </div>
                            <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("area")}</p>
                                <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.area}</span>
                            </div>
                            {flat.deadline && (
                                <div className="flex min-w-[120px] px-[10px] py-[4px] flex-col justify-center items-start">
                                    <p className="text-[#535763] text-[12px] not-italic font-normal leading-[normal]">{t("deadline")}</p>
                                    <span className="text-[#000] text-[18px] not-italic font-normal leading-[normal]">{flat.deadline}</span>
                                </div>
                            )}

                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="1" height="52" viewBox="0 0 1 52" fill="none">
                            <path opacity="0.2" d="M0.5 0V52" stroke="black" />
                        </svg>
                        <div className="flex w-[147px] flex-col justify-center items-start gap-[4px] self-stretch">
                            <h1 className="text-[#000] text-[20px] not-italic font-normal leading-[normal] w-full">{flat.price}</h1>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[normal]">{flat.priceM2}</span>
                        </div>
                    </div>
                </div>
            </Link>
            <div className="flex items-center gap-[4px] flex-shrink-0">
                <Button 
                    type="button"
                    className={`flex w-[44px] h-[44px] min-w-[44px] px-0 justify-center items-center rounded-[12px] transition-all duration-300 hover:bg-[#E3E3E3] ${isFavorite ? "bg-[#DB1D31]/10" : "bg-[#F4F6FB]"}`}
                    onClick={handleLoveClick}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill={isFavorite ? "#DB1D31" : "none"}>
                        <path d="M1.33337 6.0914C1.33337 9.33335 4.01299 11.0609 5.97453 12.6073C6.66671 13.1529 7.33337 13.6667 8.00004 13.6667C8.66671 13.6667 9.33337 13.1529 10.0256 12.6073C11.9871 11.0609 14.6667 9.33335 14.6667 6.0914C14.6667 2.84944 10.9999 0.550309 8.00004 3.66709C5.00015 0.550309 1.33337 2.84944 1.33337 6.0914Z" fill={isFavorite ? "#DB1D31" : "#1C274C"} />
                    </svg>
                </Button>
            </div>
        </div>
    );
}