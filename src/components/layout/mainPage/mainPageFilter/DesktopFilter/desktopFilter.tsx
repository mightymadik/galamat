// components/DesktopFilter/DesktopFilter.tsx
"use client";
import "../commonFilter.scss";
import React, { useState, useEffect } from "react";
import { DropdownSelector } from "../Parts/dropdownSelector";
import { RoomSelector } from "../Parts/roomSelector";
import { CategorySelector } from "../Parts/categorySelector";
import { RangeSlider } from "../Parts/rangeSlider";
import { FiltersActions } from "../Parts/filtersActions";
import { useTranslations } from "next-intl";

interface Selector {
    label: string;
    items: string[];
    selected: string;
    onSelect: (val: string) => void;
    isOpen: boolean;
    toggleOpen: () => void;
}

interface DesktopFilterProps {
    selectedValue: string;
    isCityDropdownOpen: boolean;
    toggleCityDropdown: () => void;
    setSelectedKeys: (val: Set<string>) => void;

    categories: string[];
    activeCategory: string;
    setActiveCategory: (cat: string) => void;

    selectors: Selector[]; // 👈 вот тут типизируем правильно

    rooms: string[];
    selectedRooms: Set<string>;
    setSelectedRooms: (rooms: Set<string>) => void;

    sliders: any[];
    totalProjects: number;
    onReset: () => void;
    onMap: () => void;
    onFlat: () => void;
}

const DesktopFilter: React.FC<DesktopFilterProps> = ({
    selectedValue,
    isCityDropdownOpen,
    toggleCityDropdown,
    setSelectedKeys,
    categories,
    activeCategory,
    setActiveCategory,
    selectors,
    rooms,
    selectedRooms,
    setSelectedRooms,
    sliders,
    totalProjects,
    onReset,
    onMap,
    onFlat,
}) => {
    const t = useTranslations();

    return (
        <div className="mainContainer hidden lg:!flex flex-col items-start self-stretch gap-[24px]">
            <CategorySelector
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={(category) => setActiveCategory(category ?? "")}
            />

            <div className="mainPageFilterSelectors flex h-16 justify-center items-start gap-[32px]">
                {selectors.map((selector) => (
                    <DropdownSelector
                        key={selector.label}
                        label={selector.label}
                        options={selector.items}
                        selected={selector.selected}
                        setSelected={selector.onSelect}
                        isOpen={selector.isOpen}
                        toggleOpen={selector.toggleOpen}
                        buttonClassName="flex items-center self-stretch justify-between"
                        menuClassName="mainPageFilterSelectorDropdown flex flex-col items-start self-stretch"
                        itemClassName="mainPageFilterSelectorDropdownItem lex items-start self-stretch"
                    />
                ))}

                <RoomSelector
                    label={t("select_rooms")}
                    rooms={rooms}
                    selectedRooms={selectedRooms}
                    setSelectedRooms={setSelectedRooms}
                />
            </div>

            <div className="mainPageFilterSlides flex h-16 justify-center items-start gap-[32px] w-full">
                {sliders.map((s) => (
                    <RangeSlider
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        setValue={s.setValue}
                        min={s.min}
                        max={s.max}
                        step={s.step}
                    />
                ))}
            </div>

            <FiltersActions
                totalProjects={totalProjects}
                onReset={onReset}
                onMap={onMap}
                onFlat={onFlat}
            />
        </div>
    );
};

export default DesktopFilter;
