"use client"
import React, { useRef, useEffect, useState } from "react";
import { RangeSlider } from "../../mainPage/mainPageFilter";
import { DropdownSelector } from "../../mainPage/mainPageFilter";
import { RoomSelector } from "../../mainPage/mainPageFilter";
import { CategorySelector } from "../../mainPage/mainPageFilter";
import { FiltersFlatsActions } from "../Parts/filtersFlatsActions";
import { useTranslations } from "next-intl";

interface MobileFlatsFilterProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    activeCategory: string | null;
    setActiveCategory: (cat: string | null) => void;
    selectors: any[];
    selectedValues: any;
    setSelectedValues: any;
    rooms: string[];
    selectedRooms: Set<string>;
    setSelectedRooms: (rooms: Set<string>) => void;
    sliders: any[];
    totalProjects: number;
    onReset: () => void;
    onSubmit?: () => void;
}

export const MobileFlatsFilter: React.FC<MobileFlatsFilterProps> = ({
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
    onSubmit,
}) => {
    const t = useTranslations();

    const handleSubmit = () => {
        onSubmit?.();
        onClose();
    };

    return (
        <><div
            className={`mobileFilter overflow-y-auto fixed flex flex-col items-start left-0 bottom-0 w-full bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-500 ease-in-out z-40
      ${isOpen ? "translate-y-0" : "translate-y-full"}`}
            style={{ maxHeight: "75vh" }}
        >
            <div className="mobileFilterBodyContainer flex w-full px-[16px] py-[24px] flex-col items-start gap-[10px]">
                <div className="mobileFilterTitle w-full justify-between flex items-start gap-[32px] self-stretch">
                    <p className="flex-[1_0_0] text-[#122C5E] font-[Gotham] text-[24px] not-italic font-normal leading-[100%]">Фильтр</p>
                    <button onClick={onClose} className="flex w-[32px] h-[32px] p-[10px] items-center gap-[10px] [aspect-ratio:1/1] rounded-[16px] bg-[#F4F6FB]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10.6464 0.146447C10.8417 -0.0488153 11.1582 -0.0488155 11.3535 0.146447C11.5487 0.341712 11.5487 0.658228 11.3535 0.853478L6.45699 5.74996L11.3535 10.6464C11.5487 10.8417 11.5487 11.1582 11.3535 11.3535C11.1582 11.5487 10.8417 11.5487 10.6464 11.3535L5.74996 6.45699L0.853478 11.3535C0.658228 11.5487 0.341712 11.5487 0.146447 11.3535C-0.0488155 11.1582 -0.0488155 10.8417 0.146447 10.6464L5.04293 5.74996L0.146447 0.853478C-0.0488155 0.658216 -0.0488155 0.341709 0.146447 0.146447C0.341709 -0.0488155 0.658216 -0.0488155 0.853478 0.146447L5.74996 5.04293L10.6464 0.146447Z" fill="#122C5E" />
                        </svg>
                    </button>
                </div>
                <CategorySelector
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                />
                <div className="flex items-start gap-[32px] self-stretch flex-col">
                    <div className="mainPageFilterSlides flex h-16 justify-center items-start gap-[32px] w-full">
                        {sliders.length > 0 && (
                            <RangeSlider
                                key={sliders[0].label}
                                label={sliders[0].label}
                                value={sliders[0].value}
                                setValue={sliders[0].setValue}
                                min={sliders[0].min}
                                max={sliders[0].max}
                                step={sliders[0].step}
                            />
                        )}
                    </div>
                    <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] w-full">
                        {selectors.length > 0 && (
                            <DropdownSelector
                                key={selectors[0].label}
                                label={selectors[0].label}
                                options={selectors[0].items}
                                selected={selectors[0].selected}
                                setSelected={selectors[0].onSelect}
                                isOpen={selectors[0].isOpen}
                                toggleOpen={selectors[0].toggleOpen}
                                buttonClassName="flex items-center self-stretch justify-between"
                                menuClassName="mainPageFilterSelectorDropdown flex flex-col items-start self-stretch"
                                itemClassName="mainPageFilterSelectorDropdownItem flex items-start self-stretch"
                            />
                        )}
                    </div>
                </div>
                <div className="flex h-full justify-center items-start gap-[32px] self-stretch w-full">
                    <div className="flex items-start gap-[32px] flex-[1_0_0] w-full flex-col">
                        {selectors.slice(1).map((selector) => (
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
                <div className="flex h-full justify-center items-start gap-[32px] self-stretch flex-col w-full">
                    {sliders.slice(1).map((slider) => (
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
                <div className="flex justify-end items-end gap-[12px] w-full flex-col">
                    <FiltersFlatsActions
                        totalProjects={totalProjects}
                        onReset={onReset}
                        onSubmit={handleSubmit}
                    />
                </div>
            </div>
        </div>
            <div
                className={`fixed inset-0 z-30 transition-opacity duration-500 ${isOpen ? "visible bg-black/80" : "invisible bg-transparent"}`}
                onClick={onClose} /></>
    )
}

export default MobileFlatsFilter