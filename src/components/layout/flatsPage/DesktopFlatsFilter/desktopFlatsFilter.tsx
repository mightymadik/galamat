"use client"
import React from "react";
import { RangeSlider } from "../../mainPage/mainPageFilter";
import { DropdownSelector } from "../../mainPage/mainPageFilter";
import { RoomSelector } from "../../mainPage/mainPageFilter";
import { CategorySelector } from "../../mainPage/mainPageFilter";
import { FiltersFlatsActions } from "../Parts/filtersFlatsActions";
import { useTranslations } from "next-intl";

interface Selector {
    label: string;
    items: string[];
    selected: string;
    onSelect: (val: string) => void;
    isOpen: boolean;
    toggleOpen: () => void;
}

interface DesktopFlatsFilterProps {
    selectedValue: string;
    isCityDropdownOpen: boolean;
    toggleCityDropdown: () => void;
    setSelectedKeys: (val: Set<string>) => void;

    categories: string[];
    activeCategory: string | null;
    setActiveCategory: (cat: string | null) => void;

    selectors: Selector[]; // 👈 вот тут типизируем правильно

    rooms: string[];
    selectedRooms: Set<string>;
    setSelectedRooms: (rooms: Set<string>) => void;

    sliders: any[];
    totalProjects: number;
    onReset: () => void;
    onMap: () => void;
    onSubmit?: () => void;
}

const DesktopFlatsFilter: React.FC<DesktopFlatsFilterProps> = ({
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
    onSubmit,
}) => {
    const t = useTranslations();

    return (
        <div className="hidden lg:flex flex-col items-start gap-[24px] self-stretch">
            <div className="flex flex-col justify-center items-start gap-[16px] w-full">
                <div className="flex h-[62px] justify-center items-start gap-[32px] self-stretch w-full">
                    <div className="flex flex-row items-start gap-[32px] flex-[1_0_0] w-full">
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
                                itemClassName="mainPageFilterSelectorDropdownItem flex items-start self-stretch"
                            />
                        ))}
                        <RoomSelector
                            label={t("select_rooms")}
                            rooms={rooms}
                            selectedRooms={selectedRooms}
                            setSelectedRooms={setSelectedRooms}
                        />
                    </div>
                </div>
                <div className="flex h-[64px] justify-center items-start gap-[32px] self-stretch">
                    {sliders.map((slider) => (
                        <RangeSlider
                            key={slider.label}
                            label={slider.label}
                            value={slider.value}
                            setValue={slider.setValue}
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                        />
                    ))}
                </div>
            </div>
            <div className="flex justify-end items-end gap-[12px] w-full">
                <CategorySelector
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                />
                <FiltersFlatsActions
                    totalProjects={totalProjects}
                    onReset={onReset}
                    onMap={onMap}
                    onSubmit={onSubmit}
                />
            </div>

        </div>
    )
}

export default DesktopFlatsFilter