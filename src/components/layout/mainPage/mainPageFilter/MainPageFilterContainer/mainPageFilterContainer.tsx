'use client'
import React, { useState, useEffect, useCallback } from "react";
import { DropdownSelector } from "../Parts/dropdownSelector";
import DesktopFilter from "../DesktopFilter/desktopFilter";
import MobileFilter from "../MobileFilter/mobileFilter";
import { useRouter } from "next/navigation";
import { useProjects } from "@/contexts/ProjectsContext";
import { ProjectDetail } from "@/types/projectCatalog";
import { FilterSkeleton, MobileFilterSkeleton } from "../Parts/filterSkeleton";
import { useTranslations } from "next-intl";

export default function FilterTitle() {
    const t = useTranslations();
    const { setProjects, setIsLoading, totalProjects, setTotalProjects, setHasFiltered } = useProjects();

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const handleClick = () => {
        setIsFilterOpen((prev) => !prev);
    };

    // Dropdown city
    const [isCityDropdownOpen, setIsOpen] = React.useState(false);
    const toggleCityDropdown = () => setIsOpen(!isCityDropdownOpen);
    const [selectedKeys, setSelectedKeys] = React.useState(new Set(["astana"]));
    const selectedValue = React.useMemo(
        () => Array.from(selectedKeys).join(", ").replace(/_/g, " "),
        [selectedKeys]
    );

    // Categories Filter
    const [activeCategory, setActiveCategory] = useState("");
    const categories = ["Ипотека", "Рассрочка", "Комфорт", "Комфорт+", "Стандарт"];

    // Rooms Filter - множественный выбор
    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
    const [availableRooms, setAvailableRooms] = useState<string[]>([]);
    
    // Available filter values
    const [availableComplexes, setAvailableComplexes] = useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

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

    // Диапазоны для слайдеров (загружаются из API)
    const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 20000000, max: 50000000 });
    const [pricePerM2Range, setPricePerM2Range] = useState<{ min: number; max: number }>({ min: 325000, max: 500000 });
    const [areaRange, setAreaRange] = useState<{ min: number; max: number }>({ min: 36, max: 101 });
    
    // === States ===
    const [priceValue, setPriceValue] = useState<[number, number]>([20000000, 50000000]);
    const [pricePerM2Value, setPricePerM2Value] = useState<[number, number]>([325000, 500000]);
    const [m2Value, setM2Value] = useState<[number, number]>([36, 101]);

    //Selectors map
    const [selectedValues, setSelectedValues] = useState({
        district: t("all"),
        complex: t("all"),
    });

    const [mounted, setMounted] = useState(false);
    const [isInitialMount, setIsInitialMount] = useState(true);
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    
    useEffect(() => {
        setMounted(true);
        // После монтирования помечаем, что начальная загрузка завершена
        const timer = setTimeout(() => setIsInitialMount(false), 100);
        return () => clearTimeout(timer);
    }, []);

    // Загрузка доступных значений фильтров и диапазонов
    useEffect(() => {
        const loadFilterOptions = async () => {
            setIsLoadingFilters(true);
            try {
                // Загружаем диапазоны для слайдеров (мин/макс значения)
                const [priceRangeRes, pricePerM2RangeRes, areaRangeRes] = await Promise.all([
                    fetch("/api/projectCatalog/filterOptions?type=priceRange"),
                    fetch("/api/projectCatalog/filterOptions?type=priceM2Range"),
                    fetch("/api/projectCatalog/filterOptions?type=areaRange"),
                ]);

                if (priceRangeRes.ok) {
                    const priceRangeData = await priceRangeRes.json();
                    if (priceRangeData.data?.min !== undefined && priceRangeData.data?.max !== undefined) {
                        const newRange = { min: priceRangeData.data.min, max: priceRangeData.data.max };
                        setPriceRange(newRange);
                        // Устанавливаем начальные значения слайдера на основе реальных данных
                        setPriceValue([newRange.min, newRange.max]);
                    }
                }

                if (pricePerM2RangeRes.ok) {
                    const pricePerM2RangeData = await pricePerM2RangeRes.json();
                    if (pricePerM2RangeData.data?.min !== undefined && pricePerM2RangeData.data?.max !== undefined) {
                        const newRange = { min: pricePerM2RangeData.data.min, max: pricePerM2RangeData.data.max };
                        setPricePerM2Range(newRange);
                        setPricePerM2Value([newRange.min, newRange.max]);
                    }
                }

                if (areaRangeRes.ok) {
                    const areaRangeData = await areaRangeRes.json();
                    if (areaRangeData.data?.min !== undefined && areaRangeData.data?.max !== undefined) {
                        const newRange = { min: areaRangeData.data.min, max: areaRangeData.data.max };
                        setAreaRange(newRange);
                        setM2Value([newRange.min, newRange.max]);
                    }
                }

                // Загружаем доступные значения для селекторов
                const [roomsRes, complexesRes, districtsRes] = await Promise.all([
                    fetch("/api/projectCatalog/filterOptions?type=rooms"),
                    fetch("/api/projectCatalog/filterOptions?type=complexes"),
                    fetch("/api/projectCatalog/filterOptions?type=districts"),
                ]);

                if (roomsRes.ok) {
                    const roomsData = await roomsRes.json();
                    setAvailableRooms(roomsData.data || []);
                }

                if (complexesRes.ok) {
                    const complexesData = await complexesRes.json();
                    setAvailableComplexes(complexesData.data || []);
                }

                if (districtsRes.ok) {
                    const districtsData = await districtsRes.json();
                    setAvailableDistricts(districtsData.data || []);
                }
            } catch (error) {
                console.error("Error loading filter options:", error);
            } finally {
                setIsLoadingFilters(false);
            }
        };

        if (mounted) {
            loadFilterOptions();
        }
    }, [mounted]);

    // Функция для загрузки отфильтрованных проектов
    const fetchFilteredProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            
            // Добавляем фильтры в query string
            // Проверяем, что значения отличаются от минимальных/максимальных в диапазоне
            if (priceValue[0] > priceRange.min) params.append("priceMin", String(priceValue[0]));
            if (priceValue[1] < priceRange.max) params.append("priceMax", String(priceValue[1]));
            if (pricePerM2Value[0] > pricePerM2Range.min) params.append("pricePerM2Min", String(pricePerM2Value[0]));
            if (pricePerM2Value[1] < pricePerM2Range.max) params.append("pricePerM2Max", String(pricePerM2Value[1]));
            if (m2Value[0] > areaRange.min) params.append("areaMin", String(m2Value[0]));
            if (m2Value[1] < areaRange.max) params.append("areaMax", String(m2Value[1]));
            
            // Множественный выбор комнат
            if (selectedRooms.size > 0) {
                selectedRooms.forEach((room) => {
                    params.append("rooms", room);
                });
            }
            
            if (selectedValues.district && selectedValues.district !== t("all")) params.append("district", selectedValues.district);
            if (selectedValues.complex && selectedValues.complex !== t("all")) params.append("complex", selectedValues.complex);
            // Отправляем категорию только если она выбрана (не пустая и не пробел)
            if (activeCategory && activeCategory !== " " && activeCategory !== "") {
                params.append("category", activeCategory);
            }

            const response = await fetch(`/api/projectCatalog?${params.toString()}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("API Error:", response.status, errorData);
                throw new Error(errorData.error || `Failed to fetch projects: ${response.status}`);
            }
            
            const result = await response.json();
            const filteredProjects: ProjectDetail[] = result.data || [];
            
            setProjects(filteredProjects);
            setTotalProjects(filteredProjects.length);
            setHasFiltered(true); // Помечаем, что фильтрация была применена
        } catch (error) {
            console.error("Error fetching filtered projects:", error);
            // Не сбрасываем проекты при ошибке, оставляем текущие
        } finally {
            setIsLoading(false);
        }
    }, [priceValue, pricePerM2Value, m2Value, selectedRooms, selectedValues, activeCategory, priceRange, pricePerM2Range, areaRange, setProjects, setIsLoading, setTotalProjects, setHasFiltered]);

    // Загружаем проекты при изменении фильтров (но не при первом монтировании)
    useEffect(() => {
        if (mounted && !isInitialMount) {
            const timeoutId = setTimeout(() => {
                fetchFilteredProjects();
            }, 300); // Debounce на 300ms

            return () => clearTimeout(timeoutId);
        }
    }, [mounted, isInitialMount, priceValue, pricePerM2Value, m2Value, selectedRooms, selectedValues, activeCategory, fetchFilteredProjects]);

    const selectors = [
        {
            label: t("select_district"),
            items: [t("all"), ...availableDistricts],
            selected: selectedValues.district,
            onSelect: (val: string) =>
                setSelectedValues((prev) => ({ ...prev, district: val })),
            isOpen: isDistrictDropdownOpen,
            toggleOpen: toggleDistrictDropdown,
        },
        {
            label: t("select_complex"),
            items: [t("all"), ...availableComplexes],
            selected: selectedValues.complex,
            onSelect: (val: string) =>
                setSelectedValues((prev) => ({ ...prev, complex: val })),
            isOpen: isComplexDropdownOpen,
            toggleOpen: toggleComplexDropdown,
        },
    ];


    //Sliders Maps - используем загруженные диапазоны
    const sliders = [
        {
            label: t("price_range"),
            value: priceValue,
            setValue: setPriceValue,
            min: priceRange.min,
            max: priceRange.max,
            step: Math.max(1, Math.floor((priceRange.max - priceRange.min) / 1000)),
        },
        {
            label: t("price_per_m2_range"),
            value: pricePerM2Value,
            setValue: setPricePerM2Value,
            min: pricePerM2Range.min,
            max: pricePerM2Range.max,
            step: Math.max(1, Math.floor((pricePerM2Range.max - pricePerM2Range.min) / 1000)),
        },
        {
            label: t("area_range"),
            value: m2Value,
            setValue: setM2Value,
            min: areaRange.min,
            max: areaRange.max,
            step: 1,
        },
    ];

    const handleReset = () => {
        setActiveCategory(""); // Возвращаем к значению по умолчанию
        setSelectedRooms(new Set());
        setSelectedValues({ district: t("all"), complex: t("all") });
        setSelectedKeys(new Set(["Астана"]));
        setSelectedDistrict(new Set([t("all")]));
        setPriceValue([priceRange.min, priceRange.max]);
        setPricePerM2Value([pricePerM2Range.min, pricePerM2Range.max]);
        setM2Value([areaRange.min, areaRange.max]);
        setHasFiltered(false); // Сбрасываем флаг фильтрации при сбросе фильтров
    };

    const router = useRouter();

    const handleFlat = () => {
        router.push("/flats");
    };

    return (
        <><div className="mainPageFilter flex flex-col justify-center items-center py-[12px] lg:py-[40px]">
            <div className="wrapper flex flex-col items-start self-stretch gap-[32px]">
                <div className="mainPageFilterTitle flex items-center self-stretch lg:justify-start justify-between">
                    <h1 className="text-[6.5vw] lg:text-[42.784px]">{t("new_buildings")}</h1>
                    <button
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
                    </button>
                    <div className="hidden lg:!flex">
                        <DropdownSelector
                            label=""
                            options={["Астана"]}
                            selected={selectedValue === "astana" ? "Астана" : selectedValue}
                            setSelected={(val) => setSelectedKeys(new Set([val]))} // так правильно
                            isOpen={isCityDropdownOpen}
                            toggleOpen={toggleCityDropdown}
                            buttonClassName="text-[#2655AF] not-italic font-medium flex items-center self-stretch gap-[8px]"
                            buttonStyle={{ fontSize: "42.784px", lineHeight: "100%" }}
                            menuClassName="mainPageFilterDropdownMenu flex flex-col items-start flex-shrink-0 self-stretch p-0"
                            itemClassName="mainPageFilterDropdownItem flex items-start self-stretch"
                        />

                    </div>
                </div>
                {isLoadingFilters ? (
                    <FilterSkeleton />
                ) : (
                    <DesktopFilter
                        selectedValue={selectedValue}
                        isCityDropdownOpen={isCityDropdownOpen}
                        toggleCityDropdown={toggleCityDropdown}
                        setSelectedKeys={setSelectedKeys}
                        categories={categories}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        selectors={selectors}
                        rooms={availableRooms}
                        selectedRooms={selectedRooms}
                        setSelectedRooms={setSelectedRooms}
                        sliders={sliders}
                        totalProjects={totalProjects}
                        onReset={handleReset}
                        onFlat={handleFlat}
                        onMap={() => console.log("Показать карту")} />
                )}
            </div>
        </div>
            <div>
                <MobileFilter
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    selectors={selectors}
                    selectedValues={selectedValues}
                    setSelectedValues={setSelectedValues}
                    rooms={availableRooms}
                    selectedRooms={selectedRooms}
                    setSelectedRooms={setSelectedRooms}
                    totalProjects={totalProjects}
                    onReset={handleReset}
                    onFlat={handleFlat}
                    sliders={sliders}
                    isLoadingFilters={isLoadingFilters} />
            </div></>
    );
};
