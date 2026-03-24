"use client";
import { Fragment, useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@heroui/button"
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { openAuth } from "@/store/authSlice";
import { toggleFavorite } from "@/store/favoritesSlice";
import { FlatsFilterParams } from "../../../../../types/flat";
import type { RealEstateType } from "../../../../../types/flat";
import { useTranslations } from "next-intl";

function FlatCardSkeleton() {
  return (
    <div className="flex p-[16px] flex-col items-center gap-[24px] flex-[1_0_0] rounded-[18px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full h-full animate-pulse">
      <div className="flex flex-col items-start gap-[12px] self-stretch">
        <div className="flex items-center gap-[12px] self-stretch">
          <div className="h-6 flex-1 bg-[#F4F6FB] rounded-[8px]" />
          <div className="flex gap-[4px]">
            <div className="h-6 w-16 bg-[#F4F6FB] rounded-[16px]" />
            <div className="h-6 w-20 bg-[#F4F6FB] rounded-[16px]" />
          </div>
        </div>
        <div className="h-4 w-3/4 bg-[#F4F6FB] rounded-[4px]" />
      </div>
      <div className="relative h-[205px] w-full flex flex-col justify-center items-center gap-[8px] self-stretch">
        <div className="w-full h-full bg-[#F4F6FB] rounded-[12px]" />
      </div>
      <div className="flex h-[4px] justify-center items-center gap-[9px] self-stretch">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[4px] w-[26px] bg-[#F4F6FB] rounded-full" />
        ))}
      </div>
      <div className="flex flex-col items-start gap-[12px] self-stretch">
        <div className="flex flex-col items-start gap-[4px] self-stretch">
          <div className="h-7 w-32 bg-[#F4F6FB] rounded-[4px]" />
          <div className="h-5 w-24 bg-[#F4F6FB] rounded-[4px]" />
        </div>
        <div className="flex items-center gap-[8px] self-stretch">
          <div className="h-5 w-16 bg-[#F4F6FB] rounded-[4px]" />
          <div className="h-1 w-1 bg-[#F4F6FB] rounded-full" />
          <div className="h-5 w-20 bg-[#F4F6FB] rounded-[4px]" />
          <div className="h-1 w-1 bg-[#F4F6FB] rounded-full" />
          <div className="h-5 w-20 bg-[#F4F6FB] rounded-[4px]" />
        </div>
      </div>
      <div className="flex items-center gap-[4px] self-stretch">
        <div className="flex-1 h-[44px] bg-[#F4F6FB] rounded-[12px]" />
        <div className="w-[44px] h-[44px] bg-[#F4F6FB] rounded-[12px]" />
      </div>
    </div>
  );
}

function FlatsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[24px] w-full">
      {Array.from({ length: count }).map((_, i) => (
        <FlatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Define the type for flat objects that the component expects
interface ComponentFlat {
  id: number;
  documentId: string;
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
  objectNumber: string;
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
    documentId: property.documentId,
    title: property.projectName || "",
    address: address,
    price: formattedPrice,
    priceM2: formattedPriceM2,
    tags: property.tags || [],
    images: [...(property.images || []), ...(property.platformPlanImages || [])],
    room: property.room?.toString() || "",
    area: property.totalArea != null && Number(property.totalArea) > 0 ? `${property.totalArea} м²` : "",
    floor: property.floor != null && Number(property.floor) > 0 ? property.floor.toString() : "",
    section: property.section || "",
    entrance: property.entrance?.toString() || "0",
    objectNumber: property.apartmentNumber != null ? String(property.apartmentNumber) : String(property.id ?? ""),
    deadline: "", // Property API не содержит deadline
    available: "1", // Все property со статусом "свободно" доступны
  };
};

interface BlockProps {
  sortKey?: string;
  filterParams?: FlatsFilterParams;
  onTotalCountChange?: (count: number) => void;
  realEstateType?: RealEstateType;
  detailBasePath?: string;
}

export default function Block({
  sortKey = "lowestPrice",
  filterParams = {},
  onTotalCountChange,
  realEstateType = "property",
  detailBasePath = "/flats",
}: BlockProps) {
  const [flats, setFlats] = useState<ComponentFlat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const locale = useLocale(); // Отслеживаем изменения локали из next-intl
  const [localeKey, setLocaleKey] = useState(locale); // Ключ для принудительного обновления
  const t = useTranslations();
  // Отслеживаем изменения locale из cookie (когда пользователь меняет язык)
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

    // Проверяем при монтировании
    checkLocale();

    // Проверяем периодически для отслеживания изменений cookie
    const interval = setInterval(checkLocale, 500);

    return () => clearInterval(interval);
  }, [localeKey]); // Зависимость только от localeKey, чтобы избежать цикла

  const PAGE_SIZE = 24;
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Stable key: only changes when filter content changes (prevents double fetch from reference changes)
  const filterKey = useMemo(() => JSON.stringify(filterParams), [filterParams]);

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
    params.set("type", realEstateType);
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
  }, [loading, filterKey, localeKey, onTotalCountChange, realEstateType]);

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
    params.set("type", realEstateType);
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
  if (loading) {
    return (
      <div className="animate-fadeInFast w-full">
        <div className="wrapper">
          <FlatsGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  // Показываем fade-out для старых карточек или skeleton во время загрузки новых
  if (isFadingOut || loading) {
    return (
      <div className="w-full">
        <div className="wrapper">
          {/* Старые карточки с fade-out */}
          {flats.length > 0 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[24px] w-full animate-fadeOut">
              {sortedFlats.map((flat, index) => (
                <FlatCard key={flat.id || index} flat={flat} detailBasePath={detailBasePath} realEstateType={realEstateType} />
              ))}
            </div>
          )}
          {/* Skeleton loader */}
            <div className="animate-fadeInFast">
              <FlatsGridSkeleton count={12} />
            </div>
        </div>
      </div>
    );
  }

  if (flats.length === 0) {
    return (
      <div className="py-[40px] animate-fadeInFast w-full">
        <div className="wrapper">
          <p className="text-center text-gray-500">{t("no_data")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Grid из карточек */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[24px] w-full animate-fadeIn">
        {sortedFlats.map((flat, index) => (
          <div
            key={`flat-${flat.documentId ?? flat.id}-${index}`}
            className="animate-fadeIn"
            style={{
              animationDelay: `${Math.min(index * 50, 300)}ms`,
            }}
          >
            <FlatCard flat={flat} detailBasePath={detailBasePath} realEstateType={realEstateType} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8 animate-in fade-in duration-500">
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

function FlatCard({ flat, detailBasePath, realEstateType }: { flat: ComponentFlat; detailBasePath: string; realEstateType: RealEstateType }) {
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

  const flatHref = `${detailBasePath}/${flat.documentId}`;
  const typeLabel =
    realEstateType === "commerce" ? "Коммерция" :
    realEstateType === "parking" ? "Паркинг" :
    realEstateType === "pantry" ? "Кладовка" : `${flat.room} ${t("rooms_count")}`;
  const showPriceM2 = realEstateType !== "parking" && Boolean(flat.priceM2 && !flat.priceM2.startsWith("0 "));
  const detailItems = [
    typeLabel,
    realEstateType !== "property" && flat.objectNumber ? `№${flat.objectNumber}` : "",
    realEstateType !== "property" && flat.entrance && flat.entrance !== "0" ? `${t("entrance")} ${flat.entrance}` : "",
    flat.area,
    flat.floor ? `${flat.floor} ${t("floor")}` : "",
  ].filter(Boolean);
  return (
    <>
    <div className="flex p-[16px] flex-col items-center gap-[24px] flex-[1_0_0] rounded-[18px] border-[2px] border-solid border-[#E3E3E3] bg-[#FFF] w-full h-full">
      <Link href={flatHref} className="flex flex-col items-center gap-[24px] self-stretch flex-1 min-w-0 w-full">
        {/* Верхняя часть */}
        <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
          <div className="flex items-center gap-[12px] self-stretch">
            <h1 className="flex-[1_0_0] text-[#07071F] text-[24px] font-medium">
              {flat.title}
            </h1>
            <div className="flex justify-end items-center gap-[4px] flex-[1_0_0] flex-wrap">
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
          <p className="text-[#122C5E] text-[12px]">{flat.address}</p>
        </div>

        {/* Изображение */}
        <div className="relative h-[205px] w-full flex flex-col justify-center items-center gap-[8px] self-stretch min-h-0 overflow-hidden rounded-[12px]">
          <div
            className="absolute left-0 top-0 h-full w-1/2 z-10 cursor-pointer"
            onMouseEnter={() => handleHover("left")}
          ></div>
          <div
            className="absolute right-0 top-0 h-full w-1/2 z-10 cursor-pointer"
            onMouseEnter={() => handleHover("right")}
          ></div>

          {flat.images && flat.images.length > 0 && flat.images[activeIndex] ? (
            <div className="relative w-full h-full min-w-0 min-h-0 flex items-center justify-center">
              <Image
                src={flat.images[activeIndex]}
                alt={flat.title}
                width={216}
                height={193}
                className="transition-all duration-500 object-contain max-h-full max-w-full w-auto h-auto"
              />
            </div>
          ) : (
            <div className="w-full h-full min-h-[193px] bg-gray-200 rounded-[12px] flex items-center justify-center">
              <span className="text-gray-500">No image</span>
            </div>
          )}
        </div>

        {/* Индикатор фото / планировок */}
        {flat.images && flat.images.length > 1 && (
          <div className="flex h-[4px] justify-center items-center gap-[9px] self-stretch">
            {flat.images.map((_, i) => (
              <div
                key={i}
                className={`h-[4px] rounded-full transition-all duration-200 ${
                  i === activeIndex ? "w-[26px] bg-[#122C5E]" : "w-[4px] bg-[#E3E3E3]"
                }`}
              />
            ))}
          </div>
        )}

        {/* Цена и детали */}
        <div className="flex flex-col items-start gap-[12px] self-stretch w-full">
          <div className="flex flex-col items-start gap-[4px] self-stretch">
            <h1 className="text-[#07071F] text-[24px] font-medium">{flat.price}</h1>
            {showPriceM2 && <span className="text-[#07071F] text-[16px] opacity-45">{flat.priceM2}</span>}
          </div>
          <div className="flex items-center gap-[8px] self-stretch">
            {detailItems.map((item, idx) => (
              <Fragment key={`${item}-${idx}`}>
                {idx > 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6">
                    <circle cx="3" cy="3" r="3" fill="#CCCCCC" />
                  </svg>
                )}
                <span className="text-[#07071F] text-[16px]">{item}</span>
              </Fragment>
            ))}
          </div>
        </div>
      </Link>

      {/* Кнопки — вне Link, чтобы клик не вызывал навигацию */}
      <div className="flex items-center gap-[4px] self-stretch w-full">
        <Button
          type="button"
          className={`flex w-full h-[44px] p-[13px] justify-center items-center rounded-[12px] transition-all duration-300 ${isFavorite ? "bg-[#DB1D31]/10" : "bg-[#F4F6FB]"}`}
          onClick={handleLoveClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path
              d="M1.333 6.091C1.333 9.333 4.013 11.061 5.975 12.607C6.667 13.153 7.333 13.667 8 13.667C8.667 13.667 9.333 13.153 10.026 12.607C11.987 11.061 14.667 9.333 14.667 6.091C14.667 2.849 11 0.55 8 3.667C5 0.55 1.333 2.849 1.333 6.091Z"
              fill={isFavorite ? "#DB1D31" : "#1C274C"}
            />
          </svg>
        </Button>
      </div>
    </div>
    </>
  );
}