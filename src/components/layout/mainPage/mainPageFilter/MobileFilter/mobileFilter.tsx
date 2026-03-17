// components/MobileFilter.tsx
"use client";
import "../commonFilter.scss";
import React, { useEffect } from "react";
import { DropdownSelector } from "../Parts/dropdownSelector";
import { RoomSelector } from "../Parts/roomSelector";
import { CategorySelector } from "../Parts/categorySelector";
import { RangeSlider } from "../Parts/rangeSlider";
import { FiltersActions } from "../Parts/filtersActions";
import { useTranslations } from "next-intl";

interface MobileFilterProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    activeCategory: string;
    setActiveCategory: (cat: string) => void;
    selectors: any[];
    selectedValues: any;
    setSelectedValues: any;
    rooms: string[];
    selectedRooms: Set<string>;
    setSelectedRooms: (rooms: Set<string>) => void;
    sliders: any[];
    totalProjects: number;
    onReset: () => void;
    onFlat: () => void;
    isLoadingFilters?: boolean;
}

export const MobileFilter: React.FC<MobileFilterProps> = ({
    isOpen,
    onClose,
    categories,
    activeCategory,
    setActiveCategory,
    selectors,
    selectedValues,
    setSelectedValues,
    rooms,
    selectedRooms,
    setSelectedRooms,
    sliders,
    totalProjects,
    onReset,
    onFlat,
    isLoadingFilters = false
}) => {
    const t = useTranslations();
    
    // Блокируем скролл html и body при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            // Сохраняем текущую позицию скролла
            const scrollY = window.scrollY;
            const htmlStyle = document.documentElement.style;
            const bodyStyle = document.body.style;
            
            // Сохраняем оригинальные значения
            const originalHtmlOverflow = htmlStyle.overflow;
            const originalHtmlPosition = htmlStyle.position;
            const originalHtmlWidth = htmlStyle.width;
            const originalHtmlTop = htmlStyle.top;
            
            const originalBodyOverflow = bodyStyle.overflow;
            const originalBodyPosition = bodyStyle.position;
            const originalBodyWidth = bodyStyle.width;
            const originalBodyTop = bodyStyle.top;
            
            // Блокируем скролл на html элементе
            htmlStyle.overflow = 'hidden';
            htmlStyle.position = 'fixed';
            htmlStyle.width = '100%';
            htmlStyle.top = `-${scrollY}px`;
            
            // Блокируем скролл на body элементе
            bodyStyle.overflow = 'hidden';
            bodyStyle.position = 'fixed';
            bodyStyle.width = '100%';
            bodyStyle.top = `-${scrollY}px`;
            
            // Восстанавливаем при размонтировании или закрытии
            return () => {
                htmlStyle.overflow = originalHtmlOverflow;
                htmlStyle.position = originalHtmlPosition;
                htmlStyle.width = originalHtmlWidth;
                htmlStyle.top = originalHtmlTop;
                
                bodyStyle.overflow = originalBodyOverflow;
                bodyStyle.position = originalBodyPosition;
                bodyStyle.width = originalBodyWidth;
                bodyStyle.top = originalBodyTop;
                
                // Восстанавливаем позицию скролла
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Обработчик для кнопки "Найдено X проекта" - закрывает модальное окно и вызывает onFlat
    const handleFlatClick = () => {
        onFlat();
        onClose();
    };

    return (
        <><div
            className={`mobileFilter overflow-y-auto fixed flex flex-col items-start left-0 bottom-0 w-full bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-500 ease-in-out z-40
      ${isOpen ? "translate-y-0" : "translate-y-full"}`}
            style={{ maxHeight: "75vh" }}
        >
            <div className="mobileFilterBodyContainer flex w-full px-[16px] py-[24px] flex-col items-start gap-[10px]">
                {/* Header */}
                <div className="mobileFilterTitle w-full justify-between flex items-start gap-[32px] self-stretch">
                    <p className="flex-[1_0_0] text-[#122C5E] font-[Gotham] text-[24px] not-italic font-normal leading-[100%]">Фильтр</p>
                    <button onClick={onClose} className="flex w-[32px] h-[32px] p-[10px] items-center gap-[10px] [aspect-ratio:1/1] rounded-[16px] bg-[#F4F6FB]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M10.6464 0.146447C10.8417 -0.0488153 11.1582 -0.0488155 11.3535 0.146447C11.5487 0.341712 11.5487 0.658228 11.3535 0.853478L6.45699 5.74996L11.3535 10.6464C11.5487 10.8417 11.5487 11.1582 11.3535 11.3535C11.1582 11.5487 10.8417 11.5487 10.6464 11.3535L5.74996 6.45699L0.853478 11.3535C0.658228 11.5487 0.341712 11.5487 0.146447 11.3535C-0.0488155 11.1582 -0.0488155 10.8417 0.146447 10.6464L5.04293 5.74996L0.146447 0.853478C-0.0488155 0.658216 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658216 -0.0488155 0.853478 0.146447L5.74996 5.04293L10.6464 0.146447Z" fill="#122C5E" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                {isLoadingFilters ? (
                    <div className="mobileFilters flex flex-col items-start gap-[16px] self-stretch">
                        {/* Category Skeleton */}
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className="h-10 w-20 bg-[#F4F6FB] rounded-lg animate-pulse"
                                />
                            ))}
                        </div>

                        {/* Selectors Skeleton */}
                        <div className="mobileSelectors flex flex-col justify-center items-start gap-[12px] self-stretch">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-16 w-full bg-[#F4F6FB] rounded-lg animate-pulse"
                                />
                            ))}
                        </div>

                        {/* Sliders Skeleton */}
                        <div className="mobileSliders w-full">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-20 w-full bg-[#F4F6FB] rounded-lg animate-pulse mb-4"
                                />
                            ))}
                        </div>

                        {/* Actions Skeleton */}
                        <div className="mobileFilterResults flex flex-col gap-3 w-full pb-[80px]">
                            <div className="h-11 w-full bg-[#F4F6FB] rounded-lg animate-pulse" />
                            <div className="h-11 w-full bg-[#F4F6FB] rounded-lg animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <div className="mobileFilters flex flex-col items-start gap-[16px] self-stretch">
                        <CategorySelector categories={categories} activeCategory={activeCategory} setActiveCategory={(category) => setActiveCategory(category ?? "")} />

                        <div className="mobileSelectors flex flex-col justify-center items-start gap-[12px] self-stretch">
                            {selectors.map((selector, index) => (
                                <div key={index} className="mainPageFilterSelector flex h-[62px] flex-col items-start gap-[4px] self-stretch">
                                    <DropdownSelector
                                        key={index}
                                        label={selector.label}
                                        options={selector.items}
                                        selected={selectedValues[selector.label.includes("район") ? "district" : "complex"]}
                                        setSelected={(val) => {
                                            const key = selector.label.includes("район") ? "district" : "complex";
                                            setSelectedValues((prev: any) => ({ ...prev, [key]: val }));
                                        }}
                                        isOpen={selector.isOpen}
                                        toggleOpen={selector.onToggle}
                                        buttonClassName="flex items-center self-stretch justify-between"
                                        menuClassName="mainPageFilterSelectorDropdown flex flex-col items-start self-stretch"
                                        itemClassName="mainPageFilterSelectorDropdownItem lex items-start self-stretch" />
                                </div>
                            ))}

                            <RoomSelector label={t("select_rooms")} rooms={rooms} selectedRooms={selectedRooms} setSelectedRooms={setSelectedRooms} />
                        </div>

                        <div className="mobileSliders w-full">
                            {sliders.map((s) => (
                                <RangeSlider key={s.label} label={s.label} value={s.value} setValue={s.setValue} min={s.min} max={s.max} step={s.step} />
                            ))}
                        </div>
                    </div>
                )}

                {!isLoadingFilters && (
                    <FiltersActions 
                        totalProjects={totalProjects}
                        onReset={onReset}
                        onFlat={handleFlatClick}
                    />
                )}
            </div>
        </div><div
                className={`fixed inset-0 z-30 transition-opacity duration-500 ${isOpen ? "visible bg-black/80" : "invisible bg-transparent"}`}
                onClick={onClose} /></>
    );
};

export default MobileFilter;