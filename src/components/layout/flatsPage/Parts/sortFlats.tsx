"use client"

import React, { useState, useEffect } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

interface SortFlatsProps {
    onViewChange: (view: string) => void;
    onSortChange?: (sortKey: string) => void;

}

export default function SortFlats({ onViewChange, onSortChange }: SortFlatsProps) {
    const t = useTranslations();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isDesktop, setIsDesktop] = useState(false);
    const [sortKey, setSortKey] = useState("lowestPrice");

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1025);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const buttons = [
        {
            id: 0,
            type: "block",
            svg: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9.475 11.39C9.475 9.62695 9.475 8.74542 10.0352 8.19771C10.5953 7.65 11.4969 7.65 13.3 7.65C15.1031 7.65 16.0047 7.65 16.5648 8.19771C17.125 8.74542 17.125 9.62695 17.125 11.39V13.26C17.125 15.0231 17.125 15.9046 16.5648 16.4523C16.0047 17 15.1031 17 13.3 17C11.4969 17 10.5953 17 10.0352 16.4523C9.475 15.9046 9.475 15.0231 9.475 13.26V11.39Z" />
                    <path d="M0.125 5.61C0.125 7.37305 0.125 8.25458 0.685158 8.80229C1.24532 9.35 2.14688 9.35 3.95 9.35C5.75312 9.35 6.65468 9.35 7.21484 8.80229C7.775 8.25458 7.775 7.37305 7.775 5.61V3.74C7.775 1.97695 7.775 1.09542 7.21484 0.54771C6.65468 0 5.75312 0 3.95 0C2.14688 0 1.24532 0 0.685158 0.54771C0.125 1.09542 0.125 1.97695 0.125 3.74V5.61Z" />
                    <path d="M9.475 2.975C9.475 2.05088 9.475 1.58882 9.62058 1.22434C9.81469 0.738372 10.187 0.352269 10.6556 0.150972C11.0071 0 11.4526 0 12.3438 0H14.2563C15.1474 0 15.5929 0 15.9444 0.150972C16.413 0.352269 16.7853 0.738372 16.9794 1.22434C17.125 1.58882 17.125 2.05088 17.125 2.975C17.125 3.89912 17.125 4.36118 16.9794 4.72566C16.7853 5.21163 16.413 5.59773 15.9444 5.79903C15.5929 5.95 15.1474 5.95 14.2563 5.95H12.3438C11.4526 5.95 11.0071 5.95 10.6556 5.79903C10.187 5.59773 9.81469 5.21163 9.62058 4.72566C9.475 4.36118 9.475 3.89912 9.475 2.975Z" />
                    <path d="M0.125 14.025C0.125 14.9491 0.125 15.4112 0.27058 15.7757C0.464688 16.2616 0.837002 16.6477 1.30562 16.849C1.65708 17 2.10264 17 2.99375 17H4.90625C5.79736 17 6.24292 17 6.59438 16.849C7.063 16.6477 7.43531 16.2616 7.62942 15.7757C7.775 15.4112 7.775 14.9491 7.775 14.025C7.775 13.1009 7.775 12.6388 7.62942 12.2743C7.43531 11.7884 7.063 11.4023 6.59438 11.201C6.24292 11.05 5.79736 11.05 4.90625 11.05H2.99375C2.10264 11.05 1.65708 11.05 1.30562 11.201C0.837002 11.4023 0.464688 11.7884 0.27058 12.2743C0.125 12.6388 0.125 13.1009 0.125 14.025Z" />
                </svg>
            ),
        },
        {
            id: 1,
            type: "list",
            svg: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M13.725 0.382812C15.3278 0.382812 16.1292 0.382812 16.6271 0.880731C17.125 1.37865 17.125 2.18004 17.125 3.78281C17.125 5.38559 17.125 6.18698 16.6271 6.68489C16.1292 7.18281 15.3278 7.18281 13.725 7.18281L3.525 7.18281C1.92222 7.18281 1.12084 7.18281 0.622919 6.68489C0.125 6.18698 0.125 5.38559 0.125 3.78281C0.125 2.18004 0.125 1.37865 0.622919 0.88073C1.12084 0.382812 1.92222 0.382812 3.525 0.382812L13.725 0.382812Z" />
                    <path d="M13.725 10.5828C15.3278 10.5828 16.1292 10.5828 16.6271 11.0807C17.125 11.5787 17.125 12.38 17.125 13.9828C17.125 15.5856 17.125 16.387 16.6271 16.8849C16.1292 17.3828 15.3278 17.3828 13.725 17.3828L3.525 17.3828C1.92222 17.3828 1.12084 17.3828 0.622919 16.8849C0.125 16.387 0.125 15.5856 0.125 13.9828C0.125 12.38 0.125 11.5786 0.622919 11.0807C1.12084 10.5828 1.92222 10.5828 3.525 10.5828L13.725 10.5828Z" />
                </svg>
            ),
        },
        {
            id: 2,
            type: "checkmate",
            svg: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M0.125 3.825C0.125 2.02188 0.125 1.12032 0.685158 0.560158C1.24532 0 2.14688 0 3.95 0C5.75312 0 6.65468 0 7.21484 0.560158C7.775 1.12032 7.775 2.02188 7.775 3.825C7.775 5.62812 7.775 6.52968 7.21484 7.08984C6.65468 7.65 5.75312 7.65 3.95 7.65C2.14688 7.65 1.24532 7.65 0.685158 7.08984C0.125 6.52968 0.125 5.62812 0.125 3.825Z" />
                    <path d="M9.475 13.175C9.475 11.3719 9.475 10.4703 10.0352 9.91016C10.5953 9.35 11.4969 9.35 13.3 9.35C15.1031 9.35 16.0047 9.35 16.5648 9.91016C17.125 10.4703 17.125 11.3719 17.125 13.175C17.125 14.9781 17.125 15.8797 16.5648 16.4398C16.0047 17 15.1031 17 13.3 17C11.4969 17 10.5953 17 10.0352 16.4398C9.475 15.8797 9.475 14.9781 9.475 13.175Z" />
                    <path d="M0.125 13.175C0.125 11.3719 0.125 10.4703 0.685158 9.91016C1.24532 9.35 2.14688 9.35 3.95 9.35C5.75312 9.35 6.65468 9.35 7.21484 9.91016C7.775 10.4703 7.775 11.3719 7.775 13.175C7.775 14.9781 7.775 15.8797 7.21484 16.4398C6.65468 17 5.75312 17 3.95 17C2.14688 17 1.24532 17 0.685158 16.4398C0.125 15.8797 0.125 14.9781 0.125 13.175Z" />
                    <path d="M9.475 3.825C9.475 2.02188 9.475 1.12032 10.0352 0.560158C10.5953 0 11.4969 0 13.3 0C15.1031 0 16.0047 0 16.5648 0.560158C17.125 1.12032 17.125 2.02188 17.125 3.825C17.125 5.62812 17.125 6.52968 16.5648 7.08984C16.0047 7.65 15.1031 7.65 13.3 7.65C11.4969 7.65 10.5953 7.65 10.0352 7.08984C9.475 6.52968 9.475 5.62812 9.475 3.825Z" />
                </svg>
            ),
        },
        {
            id: 3,
            type: "checkmatePro",
            svg: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.3 0.6375C13.6521 0.6375 13.9375 0.922918 13.9375 1.275V3.1875H15.85C16.2021 3.1875 16.4875 3.47292 16.4875 3.825C16.4875 4.17708 16.2021 4.4625 15.85 4.4625H13.9375V6.375C13.9375 6.72708 13.6521 7.0125 13.3 7.0125C12.9479 7.0125 12.6625 6.72708 12.6625 6.375V4.4625H10.75C10.3979 4.4625 10.1125 4.17708 10.1125 3.825C10.1125 3.47292 10.3979 3.1875 10.75 3.1875H12.6625V1.275C12.6625 0.922918 12.9479 0.6375 13.3 0.6375Z" />
                    <path d="M0.125 3.825C0.125 2.02188 0.125 1.12032 0.685158 0.560158C1.24532 0 2.14688 0 3.95 0C5.75312 0 6.65468 0 7.21484 0.560158C7.775 1.12032 7.775 2.02188 7.775 3.825C7.775 5.62812 7.775 6.52968 7.21484 7.08984C6.65468 7.65 5.75312 7.65 3.95 7.65C2.14688 7.65 1.24532 7.65 0.685158 7.08984C0.125 6.52968 0.125 5.62812 0.125 3.825Z" />
                    <path d="M9.475 13.175C9.475 11.3719 9.475 10.4703 10.0352 9.91016C10.5953 9.35 11.4969 9.35 13.3 9.35C15.1031 9.35 16.0047 9.35 16.5648 9.91016C17.125 10.4703 17.125 11.3719 17.125 13.175C17.125 14.9781 17.125 15.8797 16.5648 16.4398C16.0047 17 15.1031 17 13.3 17C11.4969 17 10.5953 17 10.0352 16.4398C9.475 15.8797 9.475 14.9781 9.475 13.175Z" />
                    <path d="M0.125 13.175C0.125 11.3719 0.125 10.4703 0.685158 9.91016C1.24532 9.35 2.14688 9.35 3.95 9.35C5.75312 9.35 6.65468 9.35 7.21484 9.91016C7.775 10.4703 7.775 11.3719 7.775 13.175C7.775 14.9781 7.775 15.8797 7.21484 16.4398C6.65468 17 5.75312 17 3.95 17C2.14688 17 1.24532 17 0.685158 16.4398C0.125 15.8797 0.125 14.9781 0.125 13.175Z" />
                </svg>
            ),
        },

    ];

    const sorts = [
        {
            key: "lowestPrice",
            label: t("cheapest"),
        },
        {
            key: "highestPrice",
            label: t("most_expensive"),
        },
        {
            key: "highestArea",
            label: t("with_largest_area"),
        },
        {
            key: "lowestArea",
            label: t("with_smallest_area"),
        },
    ];

    const [viewType, setViewType] = useState(buttons[0].type);

    const visibleButtons = buttons.filter(btn => !(btn.type === "list" && !isDesktop));

    const handleClick = (btn: any, index: number) => {
        setActiveIndex(index);
        setViewType(btn.type);
        onViewChange(btn.type); // ✅ сообщаем родителю
    };

    const handleSortChange = (key: string) => {
        setSortKey(key);
        onSortChange?.(key);
    };

    return (
        <div className="flex h-full justify-between items-center self-stretch flex-wrap gap-[24px]">
            {viewType !== "checkmate" && viewType !== "checkmatePro" && (
            <div className="flex h-full justify-between items-center gap-[24px]">
                <Dropdown>
                    <DropdownTrigger>
                        <Button
                            variant="bordered"
                            className="flex w-full h-[38px] justify-center items-center gap-[8px] rounded-[8px] bg-[#F4F6FB] lg:bg-white text-[#1E1E1E] text-[15px] font-normal"
                        >
                            {sorts.find((s) => s.key === sortKey)?.label}
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none">
                                <path
                                    d="M4.57413 3.55769L8.13195 -9.63211e-05L9.14824 1.01621L5.59043 4.57404L4.57413 5.59033L3.55779 4.57404L0 1.01621L1.01631 -9.63211e-05L4.57413 3.55769Z"
                                    fill="#828390"
                                />
                            </svg>
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                        aria-label="Сортировка"
                        selectionMode="single"
                        selectedKeys={[sortKey]}
                        onSelectionChange={(keys) => handleSortChange(Array.from(keys)[0] as string)}
                    >
                        {sorts.map((sort) => (
                            <DropdownItem key={sort.key} className="text-[#1E1E1E] text-[15px]">
                                {sort.label}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </Dropdown>
            </div>
            )}
            {viewType !== "block" && viewType !== "list" && (
            <div className="flex h-full justify-between items-center gap-[12px] lg:gap-[24px] flex-wrap">
                <div className="flex h-[32px] items-center gap-[4px]">
                    <div className="w-[18.649px] h-[18.649px] rounded-[6.471px] border-[0.791px] border-solid border-[#E5E7EB] bg-[#142A61]"></div>
                    <span className="text-[#1E1E1E] text-center text-[15.094px] not-italic font-normal leading-[19.32px]">Свободно</span>
                </div>
                <div className="flex h-[32px] items-center gap-[4px]">
                    <div className="w-[18.649px] h-[18.649px] rounded-[6.471px] border-[0.791px] border-solid border-[#E5E7EB] bg-[#F5A012]"></div>
                    <span className="text-[#1E1E1E] text-center text-[15.094px] not-italic font-normal leading-[19.32px]">Бронь</span>
                </div>
                <div className="flex h-[32px] items-center gap-[4px]">
                    <div className="w-[18.649px] h-[18.649px] rounded-[6.471px] border-[0.791px] border-solid border-[#E5E7EB] bg-[#CE2532]"></div>
                    <span className="text-[#1E1E1E] text-center text-[15.094px] not-italic font-normal leading-[19.32px]">Продано</span>
                </div>
                <div className="flex h-[32px] items-center gap-[4px]">
                    <div className="w-[18.649px] h-[18.649px] rounded-[6.471px] border-[0.791px] border-solid border-[#E5E7EB] bg-[#A7A7A7]"></div>
                    <span className="text-[#1E1E1E] text-center text-[15.094px] not-italic font-normal leading-[19.32px]">Недоступно</span>
                </div>
            </div>
            )}
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-[8px]">
                    {visibleButtons.map((btn, index) => (
                        <Button
                            key={btn.id}
                            onClick={() => handleClick(btn, index)}
                            className={`flex justify-center items-center rounded-[8px] transition-all
                                !w-[40px] !h-[40px] lg:!w-[53px] lg:!h-[44px]
                                ${activeIndex === index ? "bg-[#2655AF]" : "bg-white"}`}
                        >
                            {React.cloneElement(btn.svg, {
                                fill: activeIndex === index ? "white" : "#2655AF",
                                className: "transition-all duration-200",
                            })}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}