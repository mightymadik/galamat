"use client"

import "../../mainPage/mainPageFilter/commonFilter.scss";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/button"
import { DropdownSelector } from "../../mainPage/mainPageFilter";
import DesktopFlatsFilter from "../DesktopFlatsFilter/desktopFlatsFilter";
import MobileFlatsFilter from "../MobileFlatsFilter/mobileFlatsFilter";
import { FlatsFilterParams } from "@/types/flat";
import { filterParamsCanonicalKey, normalizeFilterParams } from "@/lib/flatsFilterUrl";
import { useTranslations } from "next-intl";
import { FlatsFilterSkeleton, MobileFlatsFilterSkeleton } from "../Parts/flatsFilterSkeleton";

/** Стабильный ключ для "Все" в фильтрах — не зависит от локали, чтобы при смене языка не показывалось "Барлығы" в русском и т.п. */
const FILTER_VALUE_ALL = "__all__";

interface PropertyFiltersMetadata {
    priceRange: { min: number; max: number };
    pricePerM2Range: { min: number; max: number };
    areaRange: { min: number; max: number };
    entranceRange: { min: number; max: number };
    roomCount: string[];
    districts: string[];
    complexes: string[];
    totalCount: number;
}

interface FlatsPageFilterProps {
    initialFilterParams?: FlatsFilterParams;
    onFilterChange?: (params: FlatsFilterParams) => void;
    onTotalCountChange?: (count: number) => void;
    totalCount?: number; // Актуальное количество квартир с учетом фильтров
    /** When provided, submit button redirects to flats with params (used on project page - no URL sync) */
    onSubmit?: (params: FlatsFilterParams) => void;
}

export default function FlatsPageFilter({ initialFilterParams, onFilterChange, totalCount, onSubmit }: FlatsPageFilterProps) {
    const t = useTranslations();
    const [totalProjects, setTotalProjects] = useState<number>(0);
    const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

    // Используем переданное количество или количество из метаданных
    useEffect(() => {
        if (totalCount !== undefined) {
            setTotalProjects(totalCount);
        }
    }, [totalCount]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const handleClick = () => {
        setIsFilterOpen((prev) => !prev);
    };

    // Dropdown city
    const [isCityDropdownOpen, setIsOpen] = React.useState(false);
    const toggleCityDropdown = () => setIsOpen(!isCityDropdownOpen);
    const [selectedKeys, setSelectedKeys] = React.useState(new Set(["Астана"]));
    const selectedValue = React.useMemo(
        () => Array.from(selectedKeys).join(", ").replace(/_/g, " "),
        [selectedKeys]
    );

    // Categories Filter
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const categories = ["Рассрочка", "Отложенный платеж"];

    // Filter metadata state
    const [filterMetadata, setFilterMetadata] = useState<PropertyFiltersMetadata | null>(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

    // Avoid re-applying same initialFilterParams (prevents loop with URL sync)
    const lastAppliedInitialRef = useRef<string>("");

    // Блокируем onFilterChange, пока применяем initialFilterParams и metadata
    const suppressEmitRef = useRef(true);
    /** Не дёргать родителя с тем же каноническим набором фильтров (иначе лишние рендеры и fetch) */
    const lastEmittedCanonicalKeyRef = useRef<string>("");

    // Apply initialFilterParams from URL on mount / when URL changes (back/forward)
    useEffect(() => {
        if (!initialFilterParams || Object.keys(initialFilterParams).length === 0) return;

        const key = JSON.stringify(initialFilterParams);
        if (key === lastAppliedInitialRef.current) return;

        // пока применяем URL — не эмитим наверх
        suppressEmitRef.current = true;

        if (initialFilterParams.district) {
            setSelectedValues((prev) => ({ ...prev, district: initialFilterParams.district! }));
            setSelectedDistrict(new Set([initialFilterParams.district!]));
        }
        if (initialFilterParams.project) {
            setSelectedValues((prev) => ({ ...prev, project: initialFilterParams.project! }));
            setSelectedComplex(new Set([initialFilterParams.project!]));
        }
        setSelectedRooms(new Set(initialFilterParams.roomCount ?? []));
        setActiveCategory(initialFilterParams.tags?.[0] ?? null);

        // ВАЖНО: помечаем, что применили
        // (слайдеры будут применяться либо в metadata effect, либо ниже в отдельном эффекте)
        lastAppliedInitialRef.current = key;
    }, [initialFilterParams]);

    // If URL params were cleared (e.g. navigate to /flats without query),
    // reset filter UI state back to defaults from metadata.
    useEffect(() => {
        if (!filterMetadata) return;
        if (initialFilterParams && Object.keys(initialFilterParams).length > 0) return;

        // If we previously applied something from URL, and now URL is empty → reset.
        if (!lastAppliedInitialRef.current) return;

        suppressEmitRef.current = true;

        setActiveCategory(null);
        setSelectedRooms(new Set());
        setSelectedValues({ district: FILTER_VALUE_ALL, project: FILTER_VALUE_ALL, view: FILTER_VALUE_ALL });
        setSelectedKeys(new Set(["Астана"]));
        setSelectedDistrict(new Set([t("all")]));
        setSelectedComplex(new Set([t("all")]));

        const nextEntrance: [number, number] = [filterMetadata.entranceRange.min, filterMetadata.entranceRange.max];
        const nextPrice: [number, number] = [filterMetadata.priceRange.min, filterMetadata.priceRange.max];
        const nextPpm2: [number, number] = [filterMetadata.pricePerM2Range.min, filterMetadata.pricePerM2Range.max];
        const nextM2: [number, number] = [filterMetadata.areaRange.min, filterMetadata.areaRange.max];

        setEntranceValue(nextEntrance);
        setPriceValue(nextPrice);
        setPricePerM2Value(nextPpm2);
        setM2Value(nextM2);

        setDebouncedEntranceValue(nextEntrance);
        setDebouncedPriceValue(nextPrice);
        setDebouncedPricePerM2Value(nextPpm2);
        setDebouncedM2Value(nextM2);

        lastAppliedInitialRef.current = "";
        // НЕ ставим suppressEmitRef = false здесь: setState батчится, buildFilterParams ещё
        // вернёт СТАРЫЕ значения. Enable-emit effect включит emit после следующего рендера.
    }, [initialFilterParams, filterMetadata, t]);


    // Apply slider values from URL when initialFilterParams changes and metadata is loaded
    useEffect(() => {
        if (!initialFilterParams || !filterMetadata) return;

        const key = JSON.stringify(initialFilterParams);
        if (key === lastAppliedInitialRef.current) return;
        lastAppliedInitialRef.current = key; // Mark as applied only after sliders (runs last)

        const clamp = (r: { min: number; max: number }, [a, b]: [number, number]) =>
            [Math.max(r.min, Math.min(r.max, a)), Math.max(r.min, Math.min(r.max, b))] as [number, number];

        if (initialFilterParams.priceRange) {
            setPriceValue(clamp(filterMetadata.priceRange, initialFilterParams.priceRange));
        }
        if (initialFilterParams.pricePerM2Range) {
            setPricePerM2Value(clamp(filterMetadata.pricePerM2Range, initialFilterParams.pricePerM2Range));
        }
        if (initialFilterParams.areaRange) {
            setM2Value(clamp(filterMetadata.areaRange, initialFilterParams.areaRange));
        }
        if (initialFilterParams.entranceRange) {
            setEntranceValue(clamp(filterMetadata.entranceRange, initialFilterParams.entranceRange));
        }
    }, [initialFilterParams, filterMetadata]);

    // Load filter metadata on mount (только один раз)
    useEffect(() => {
        if (isMetadataLoaded) return; // Не загружаем повторно

        fetch('/api/properties?metadata=true')
            .then(res => res.json())
            .then((metadata: PropertyFiltersMetadata) => {
                setFilterMetadata(metadata);
                setIsMetadataLoaded(true);
                // Устанавливаем общее количество из метаданных только если актуальное количество не передано
                // и мы НЕ на странице проекта: там количество подставит эффект с запросом по фильтру (project)
                const isProjectPage = initialFilterParams?.project != null;
                if (totalCount === undefined && !isProjectPage) {
                    setTotalProjects(metadata.totalCount || 0);
                }
                setIsLoadingMetadata(false);

                // Initialize filter values: prefer initialFilterParams from URL, else metadata
                const clamp = (r: { min: number; max: number }, [a, b]: [number, number]) =>
                    [Math.max(r.min, Math.min(r.max, a)), Math.max(r.min, Math.min(r.max, b))] as [number, number];

                let nextPrice = priceValue;
                let nextPpm2 = pricePerM2Value;
                let nextM2 = m2Value;
                let nextEntrance = entranceValue;

                if (initialFilterParams?.priceRange) {
                    nextPrice = clamp(metadata.priceRange, initialFilterParams.priceRange);
                    setPriceValue(nextPrice);
                } else if (metadata.priceRange.min > 0 && metadata.priceRange.max > 0) {
                    nextPrice = [metadata.priceRange.min, metadata.priceRange.max];
                    setPriceValue(nextPrice);
                }
                if (initialFilterParams?.pricePerM2Range) {
                    nextPpm2 = clamp(metadata.pricePerM2Range, initialFilterParams.pricePerM2Range);
                    setPricePerM2Value(nextPpm2);
                } else if (metadata.pricePerM2Range.min > 0 && metadata.pricePerM2Range.max > 0) {
                    nextPpm2 = [metadata.pricePerM2Range.min, metadata.pricePerM2Range.max];
                    setPricePerM2Value(nextPpm2);
                }
                if (initialFilterParams?.areaRange) {
                    nextM2 = clamp(metadata.areaRange, initialFilterParams.areaRange);
                    setM2Value(nextM2);
                } else if (metadata.areaRange.min > 0 && metadata.areaRange.max > 0) {
                    nextM2 = [metadata.areaRange.min, metadata.areaRange.max];
                    setM2Value(nextM2);
                }
                if (initialFilterParams?.entranceRange) {
                    nextEntrance = clamp(metadata.entranceRange, initialFilterParams.entranceRange);
                    setEntranceValue(nextEntrance);
                } else if (metadata.entranceRange.max >= metadata.entranceRange.min) {
                    nextEntrance = [metadata.entranceRange.min, metadata.entranceRange.max];
                    setEntranceValue(nextEntrance);
                }
                // Сразу обновляем debounced — иначе 300ms запрос уходит со старыми захардкоженными значениями
                setDebouncedPriceValue(nextPrice);
                setDebouncedPricePerM2Value(nextPpm2);
                setDebouncedM2Value(nextM2);
                setDebouncedEntranceValue(nextEntrance);
            })
            .catch((error) => {
                console.error("Error loading filter metadata:", error);
                setIsLoadingMetadata(false);
            });
    }, []); // Загружаем только при монтировании

    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
    const rooms = filterMetadata?.roomCount || ["1", "2", "3", "4"];

    // District Filter
    const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = React.useState(false);
    const toggleDistrictDropdown = () => setIsDistrictDropdownOpen(!isDistrictDropdownOpen);
    const [selectedDistrict, setSelectedDistrict] = React.useState(new Set([t("all")]));
    const selectedDistrictValue = React.useMemo(
        () => Array.from(selectedDistrict).join(", "),
        [selectedDistrict]
    );
    // Complex Filter
    const [isComplexDropdownOpen, setIsComplexDropdownOpen] = React.useState(false);
    const toggleComplexDropdown = () => setIsComplexDropdownOpen(!isComplexDropdownOpen);
    const [selectedComplex, setSelectedComplex] = React.useState(new Set([t("all")]));
    const selectedComplexValue = React.useMemo(
        () => Array.from(selectedComplex).join(", "),
        [selectedComplex]
    );

    // === States ===
    const [entranceValue, setEntranceValue] = useState<[number, number]>([1, 12]);
    const [priceValue, setPriceValue] = useState<[number, number]>([23839400, 46608700]);
    const [pricePerM2Value, setPricePerM2Value] = useState<[number, number]>([325000, 500000]);
    const [m2Value, setM2Value] = useState<[number, number]>([36, 101]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    //Selectors map (district/project храним как FILTER_VALUE_ALL или название; отображение "Все" через t("all"))
    const [selectedValues, setSelectedValues] = useState({
        district: FILTER_VALUE_ALL,
        project: FILTER_VALUE_ALL,
        view: FILTER_VALUE_ALL,
    });

    // Add new state for view dropdown
    const [isViewDropdownOpen, setIsViewDropdownOpen] = React.useState(false);
    const toggleViewDropdown = () => setIsViewDropdownOpen(!isViewDropdownOpen);

    const selectors = [
        {
            label: t("select_district"),
            items: [t("all"), ...(filterMetadata?.districts || [])],
            selected: selectedValues.district === FILTER_VALUE_ALL ? t("all") : selectedValues.district,
            onSelect: (val: string) =>
                setSelectedValues((prev) => ({ ...prev, district: val === t("all") ? FILTER_VALUE_ALL : val })),
            isOpen: isDistrictDropdownOpen,
            toggleOpen: toggleDistrictDropdown,
        },
        {
            label: t("select_complex"),
            items: [t("all"), ...(filterMetadata?.complexes || [])],
            selected: selectedValues.project === FILTER_VALUE_ALL ? t("all") : selectedValues.project,
            onSelect: (val: string) =>
                setSelectedValues((prev) => ({ ...prev, project: val === t("all") ? FILTER_VALUE_ALL : val })),
            isOpen: isComplexDropdownOpen,
            toggleOpen: toggleComplexDropdown,
        },
    ];


    //Sliders Maps - используем метаданные для min/max
    const sliders = [
        {
            label: t("select_entrance"),
            value: entranceValue,
            setValue: setEntranceValue,
            min: filterMetadata?.entranceRange.min || 1,
            max: filterMetadata?.entranceRange.max || 12,
            step: 1,
        },
        {
            label: t("price_range"),
            value: priceValue,
            setValue: setPriceValue,
            min: filterMetadata?.priceRange.min || 23839400,
            max: filterMetadata?.priceRange.max || 46608700,
            step: 10000,
        },
        {
            label: t("price_per_m2_range"),
            value: pricePerM2Value,
            setValue: setPricePerM2Value,
            min: filterMetadata?.pricePerM2Range.min || 325000,
            max: filterMetadata?.pricePerM2Range.max || 500000,
            step: 1000,
        },
        {
            label: t("area_range"),
            value: m2Value,
            setValue: setM2Value,
            min: filterMetadata?.areaRange.min || 36,
            max: filterMetadata?.areaRange.max || 101,
            step: 1,
        },
    ];

    // Debounced filter changes для слайдеров (чтобы не делать запрос при каждом движении)
    const [debouncedPriceValue, setDebouncedPriceValue] = useState(priceValue);
    const [debouncedPricePerM2Value, setDebouncedPricePerM2Value] = useState(pricePerM2Value);
    const [debouncedM2Value, setDebouncedM2Value] = useState(m2Value);
    const [debouncedEntranceValue, setDebouncedEntranceValue] = useState(entranceValue);

    // Debounce для слайдеров
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedPriceValue(priceValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [priceValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedPricePerM2Value(pricePerM2Value);
        }, 300);
        return () => clearTimeout(timer);
    }, [pricePerM2Value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedM2Value(m2Value);
        }, 300);
        return () => clearTimeout(timer);
    }, [m2Value]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEntranceValue(entranceValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [entranceValue]);

    // Build current filter params (used for onFilterChange and onSubmit)
    const buildFilterParams = React.useCallback((): FlatsFilterParams => {
        const isFullRange = (meta?: { min: number; max: number }, v?: [number, number]) => {
          if (!meta || !v) return false;
          return v[0] === meta.min && v[1] === meta.max;
        };
      
        const filterParams: FlatsFilterParams = {
          // Диапазоны кладём ТОЛЬКО если они НЕ равны дефолту из metadata
          priceRange:
            filterMetadata && isFullRange(filterMetadata.priceRange, debouncedPriceValue)
              ? undefined
              : debouncedPriceValue,
          pricePerM2Range:
            filterMetadata && isFullRange(filterMetadata.pricePerM2Range, debouncedPricePerM2Value)
              ? undefined
              : debouncedPricePerM2Value,
          areaRange:
            filterMetadata && isFullRange(filterMetadata.areaRange, debouncedM2Value)
              ? undefined
              : debouncedM2Value,
          entranceRange:
            filterMetadata && isFullRange(filterMetadata.entranceRange, debouncedEntranceValue)
              ? undefined
              : debouncedEntranceValue,
      
          roomCount: selectedRooms.size > 0 ? Array.from(selectedRooms) : undefined,
          district: selectedValues.district !== FILTER_VALUE_ALL ? selectedValues.district : undefined,
          project: selectedValues.project !== FILTER_VALUE_ALL ? selectedValues.project : undefined,
          tags: activeCategory ? [activeCategory] : undefined,
        };
      
        Object.keys(filterParams).forEach((key) => {
          if (filterParams[key as keyof FlatsFilterParams] === undefined) {
            delete filterParams[key as keyof FlatsFilterParams];
          }
        });
      
        return filterParams;
      }, [
        filterMetadata,
        debouncedPriceValue,
        debouncedPricePerM2Value,
        debouncedM2Value,
        debouncedEntranceValue,
        selectedRooms,
        selectedValues,
        activeCategory,
      ]);
      
    // Enable emit: только после загрузки metadata и ПОСЛЕ того как state обновлён (deps включают buildFilterParams,
    // который пересчитывается при каждом flush state → эффект повторится на «чистом» рендере).
    useEffect(() => {
        if (!filterMetadata) return;

        if (initialFilterParams && Object.keys(initialFilterParams).length > 0) {
            const key = JSON.stringify(initialFilterParams);
            if (lastAppliedInitialRef.current !== key) return;
        }

        suppressEmitRef.current = false;
    }, [filterMetadata, initialFilterParams, buildFilterParams]);

    // Effect to notify parent of filter changes
    useEffect(() => {
        if (!onFilterChange || suppressEmitRef.current) return;
        const norm = normalizeFilterParams(buildFilterParams());
        const key = filterParamsCanonicalKey(norm);
        if (key === lastEmittedCanonicalKeyRef.current) return;
        lastEmittedCanonicalKeyRef.current = key;
        onFilterChange(norm);
    }, [buildFilterParams, onFilterChange]);

    // Ключ запроса: при любом изменении фильтров (проект, ползунки, комнаты и т.д.) эффект перезапустится
    const paramsForCount = buildFilterParams();
    const projectForCount = paramsForCount.project ?? initialFilterParams?.project ?? null;
    const countRequestKey =
        onSubmit && projectForCount != null
            ? JSON.stringify({ ...paramsForCount, project: projectForCount })
            : "";

    // Когда передан onSubmit (страница проекта): запрашиваем количество по текущим фильтрам для кнопки.
    // Не ждём filterMetadata — запрос идёт сразу при наличии проекта. Ключ countRequestKey гарантирует рефетч при смене любого фильтра.
    useEffect(() => {
        if (!onSubmit || !countRequestKey) return;

        const params = buildFilterParams();
        const project = params.project ?? initialFilterParams?.project ?? null;
        if (project == null) return;

        const sp = new URLSearchParams();
        if (params.priceRange) sp.set("priceRange", params.priceRange.join(","));
        if (params.pricePerM2Range) sp.set("pricePerM2Range", params.pricePerM2Range.join(","));
        if (params.areaRange) sp.set("areaRange", params.areaRange.join(","));
        if (params.entranceRange) sp.set("entranceRange", params.entranceRange.join(","));
        if (params.roomCount?.length) sp.set("roomCount", params.roomCount.join(","));
        if (params.district) sp.set("district", params.district);
        sp.set("project", String(project).trim());
        if (params.tags?.length) sp.set("tags", params.tags.join(","));
        sp.set("page", "1");
        sp.set("pageSize", "1");

        const ac = new AbortController();
        fetch(`/api/properties?${sp.toString()}`, { signal: ac.signal })
            .then((res) => res.json())
            .then((response: { meta?: { total?: number; pagination?: { total?: number } }; data?: unknown[] }) => {
                if (ac.signal.aborted) return;
                const total =
                    response?.meta?.total ??
                    response?.meta?.pagination?.total ??
                    (Array.isArray(response?.data) ? response.data.length : undefined);
                setTotalProjects(total != null && total > 0 ? total : 0);
            })
            .catch(() => {
                if (!ac.signal.aborted) setTotalProjects(0);
            });
        return () => ac.abort();
    }, [onSubmit, countRequestKey, buildFilterParams, initialFilterParams?.project]);

    const handleSubmit = React.useCallback(() => {
        if (onSubmit) {
            onSubmit(buildFilterParams());
        }
    }, [onSubmit, buildFilterParams]);

    const handleReset = () => {
        setActiveCategory(null);
        setSelectedRooms(new Set());
        setSelectedValues({ district: FILTER_VALUE_ALL, project: FILTER_VALUE_ALL, view: FILTER_VALUE_ALL });
        setSelectedKeys(new Set(["Астана"]));
        setSelectedDistrict(new Set([t("all")]));

        // Используем метаданные для сброса значений или значения по умолчанию
        if (filterMetadata) {
            setEntranceValue([filterMetadata.entranceRange.min, filterMetadata.entranceRange.max]);
            setPriceValue([filterMetadata.priceRange.min, filterMetadata.priceRange.max]);
            setPricePerM2Value([filterMetadata.pricePerM2Range.min, filterMetadata.pricePerM2Range.max]);
            setM2Value([filterMetadata.areaRange.min, filterMetadata.areaRange.max]);
        } else {
            setEntranceValue([1, 12]);
            setPriceValue([23_839_400, 46_608_700]);
            setPricePerM2Value([325_000, 500_000]);
            setM2Value([36, 101]);
        }
    };

    // Показываем skeleton loader пока загружаются метаданные
    if (isLoadingMetadata) {
        return (
            <div className="pt-[20px] pb-[12px] lg:pb-[31px] transition-opacity duration-300">
                <div className="wrapper flex pr-1 flex-col justify-center items-start gap-[32px]">
                    <div className="flex items-center gap-[8px] self-stretch justify-between lg:justify-start">
                        <h1 className="text-[6.5vw] font-medium lg:text-[42.784px]">{t("new_buildings")}</h1>
                        <Button
                            className="group flex lg:!hidden h-[36px] gap-[4px] min-w-[36px] min-h-[36px] p-[3vw] justify-center items-center rounded-[12px] bg-[#F4F6FB] transition-all duration-300"
                            disabled
                        >
                            <svg className="transition-all duration-300" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#1A3C7E">
                                <path d="M6.1665 9.33317C7.27107 9.33317 8.1665 10.2286 8.1665 11.3332C8.1665 12.4377 7.27107 13.3332 6.1665 13.3332C5.06193 13.3332 4.1665 12.4377 4.1665 11.3332C4.1665 10.2286 5.06193 9.33317 6.1665 9.33317Z" fill="#1C274C" />
                                <path d="M9.49984 2.6665C8.39527 2.6665 7.49984 3.56193 7.49984 4.6665C7.49984 5.77107 8.39527 6.6665 9.49984 6.6665C10.6044 6.6665 11.4998 5.77107 11.4998 4.6665C11.4998 3.56193 10.6044 2.6665 9.49984 2.6665Z" fill="#1C274C" />
                                <path d="M5.83317 4.13885C6.10931 4.13885 6.33317 4.36271 6.33317 4.63885C6.33317 4.91499 6.10931 5.13885 5.83317 5.13885L1.1665 5.13885C0.890361 5.13885 0.666504 4.91499 0.666504 4.63885C0.666504 4.36271 0.890361 4.13885 1.1665 4.13885H5.83317Z" fill="#132C5E" />
                                <path d="M9.83317 10.8055C9.55703 10.8055 9.33317 11.0294 9.33317 11.3055C9.33317 11.5817 9.55703 11.8055 9.83317 11.8055H14.4998C14.776 11.8055 14.9998 11.5817 14.9998 11.3055C14.9998 11.0294 14.776 10.8055 14.4998 10.8055H9.83317Z" fill="#132C5E" />
                                <path d="M0.666504 11.3055C0.666504 11.0294 0.890361 10.8055 1.1665 10.8055H2.49984C2.77598 10.8055 2.99984 11.0294 2.99984 11.3055C2.99984 11.5817 2.77598 11.8055 2.49984 11.8055H1.1665C0.890362 11.8055 0.666504 11.5817 0.666504 11.3055Z" fill="#132C5E" />
                                <path d="M14.4998 4.13885C14.776 4.13885 14.9998 4.36271 14.9998 4.63885C14.9998 4.91499 14.776 5.13885 14.4998 5.13885L13.1665 5.13885C12.8904 5.13885 12.6665 4.91499 12.6665 4.63885C12.6665 4.36271 12.8904 4.13885 13.1665 4.13885H14.4998Z" fill="#132C5E" />
                            </svg>
                            Фильтр
                        </Button>
                        <div className="hidden lg:!flex">
                            <div className="h-[42px] w-[120px] bg-[#F4F6FB] rounded-[12px] animate-pulse" />
                        </div>
                    </div>
                    <FlatsFilterSkeleton />
                    <MobileFlatsFilterSkeleton />
                </div>
            </div>
        );
    }

    return (
        <><div className="pt-[20px] pb-[12px] lg:pb-[31px] animate-fadeIn">
            <div className="wrapper flex pr-1 flex-col justify-center items-start gap-[32px]">
                <div className="flex items-center gap-[8px] self-stretch justify-between lg:justify-start">
                    <h1 className="text-[6.5vw] font-medium lg:text-[42.784px]">{t("new_buildings")}</h1>
                    <Button
                        onClick={handleClick}
                        className="group flex lg:!hidden h-[36px] gap-[4px] min-w-[36px] min-h-[36px] p-[3vw] justify-center items-center rounded-[12px] bg-[#F4F6FB] transition-all duration-300 active:!bg-blue-900 active:text-white cursor-pointer">
                        <svg className="transition-all duration-300 group-hover:[&_*]:fill-white" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#1A3C7E">
                            <path d="M6.1665 9.33317C7.27107 9.33317 8.1665 10.2286 8.1665 11.3332C8.1665 12.4377 7.27107 13.3332 6.1665 13.3332C5.06193 13.3332 4.1665 12.4377 4.1665 11.3332C4.1665 10.2286 5.06193 9.33317 6.1665 9.33317Z" fill="#1C274C" />
                            <path d="M9.49984 2.6665C8.39527 2.6665 7.49984 3.56193 7.49984 4.6665C7.49984 5.77107 8.39527 6.6665 9.49984 6.6665C10.6044 6.6665 11.4998 5.77107 11.4998 4.6665C11.4998 3.56193 10.6044 2.6665 9.49984 2.6665Z" fill="#1C274C" />
                            <path d="M5.83317 4.13885C6.10931 4.13885 6.33317 4.36271 6.33317 4.63885C6.33317 4.91499 6.10931 5.13885 5.83317 5.13885L1.1665 5.13885C0.890361 5.13885 0.666504 4.91499 0.666504 4.63885C0.666504 4.36271 0.890361 4.13885 1.1665 4.13885H5.83317Z" fill="#132C5E" />
                            <path d="M9.83317 10.8055C9.55703 10.8055 9.33317 11.0294 9.33317 11.3055C9.33317 11.5817 9.55703 11.8055 9.83317 11.8055H14.4998C14.776 11.8055 14.9998 11.5817 14.9998 11.3055C14.9998 11.0294 14.776 10.8055 14.4998 10.8055H9.83317Z" fill="#132C5E" />
                            <path d="M0.666504 11.3055C0.666504 11.0294 0.890361 10.8055 1.1665 10.8055H2.49984C2.77598 10.8055 2.99984 11.0294 2.99984 11.3055C2.99984 11.5817 2.77598 11.8055 2.49984 11.8055H1.1665C0.890362 11.8055 0.666504 11.5817 0.666504 11.3055Z" fill="#132C5E" />
                            <path d="M14.4998 4.13885C14.776 4.13885 14.9998 4.36271 14.9998 4.63885C14.9998 4.91499 14.776 5.13885 14.4998 5.13885L13.1665 5.13885C12.8904 5.13885 12.6665 4.91499 12.6665 4.63885C12.6665 4.36271 12.8904 4.13885 13.1665 4.13885H14.4998Z" fill="#132C5E" />
                        </svg>
                        Фильтр
                    </Button>
                    <div className="hidden lg:!flex">
                        <DropdownSelector
                            label=""
                            options={["Астана"]}
                            selected={selectedValue === "Астана" ? "Астана" : selectedValue}
                            setSelected={(val: string) => setSelectedKeys(new Set([val]))}
                            isOpen={isCityDropdownOpen}
                            toggleOpen={toggleCityDropdown}
                            buttonClassName="text-[#2655AF] not-italic font-medium flex items-center self-stretch gap-[8px]"
                            buttonStyle={{ fontSize: "42.784px", lineHeight: "100%", backgroundColor: "transparent" }}
                            menuClassName="mainPageFilterDropdownMenu flex flex-col items-start flex-shrink-0 self-stretch p-0"
                            itemClassName="mainPageFilterDropdownItem flex items-start self-stretch"
                        />
                    </div>
                </div>
                <DesktopFlatsFilter
                    selectedValue={selectedValue}
                    isCityDropdownOpen={isCityDropdownOpen}
                    toggleCityDropdown={toggleCityDropdown}
                    setSelectedKeys={setSelectedKeys}
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    selectors={selectors}
                    rooms={rooms}
                    selectedRooms={selectedRooms}
                    setSelectedRooms={setSelectedRooms}
                    sliders={sliders}
                    totalProjects={totalProjects}
                    onReset={handleReset}
                    onMap={() => console.log("Показать карту")}
                    onSubmit={onSubmit ? handleSubmit : undefined}
                />
            </div>
        </div><div>
                <MobileFlatsFilter
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    selectors={selectors}
                    selectedValues={selectedValues}
                    setSelectedValues={setSelectedValues}
                    rooms={rooms}
                    selectedRooms={selectedRooms}
                    setSelectedRooms={setSelectedRooms}
                    totalProjects={totalProjects}
                    onReset={handleReset}
                    sliders={sliders}
                    onSubmit={onSubmit ? handleSubmit : undefined}
                />
            </div>
        </>
    )
}