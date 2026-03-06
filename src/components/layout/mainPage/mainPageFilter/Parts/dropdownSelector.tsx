"use client";
import React, { useRef, useEffect, useState } from "react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from "@heroui/react";

interface DropdownSelectorProps {
    label: string;
    options: string[];
    selected: string;
    setSelected: (val: string) => void;
    isOpen?: boolean;
    toggleOpen?: () => void;
    buttonClassName?: string;
    menuClassName?: string;
    itemClassName?: string;
    buttonStyle?: React.CSSProperties;
    menuStyle?: React.CSSProperties;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
    label,
    options,
    selected,
    setSelected,
    isOpen,
    toggleOpen,
    buttonClassName,
    menuClassName,
    itemClassName,
    buttonStyle,
}) => {

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuWidth, setMenuWidth] = useState<number>(0);

    useEffect(() => {
        function updateWidth() {
            if (buttonRef.current) setMenuWidth(buttonRef.current.offsetWidth);
        }

        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);
    return (
        <div className="mainPageFilterSelector w-full flex flex-col items-start">
            <p className="flex self-stretch overflow-hidden text-xs not-italic font-normal">{label}</p>
            <Dropdown>
                <DropdownTrigger>
                    <Button
                        ref={buttonRef}
                        variant="bordered"
                        className={buttonClassName}
                        style={buttonStyle}
                        onClick={toggleOpen}
                    >
                        {selected}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className={`transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
                        >
                            <path d="M12.6663 6L7.99967 10L3.33301 6" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Button>
                </DropdownTrigger>
                <DropdownMenu
                    aria-label={label}
                    disallowEmptySelection
                    selectionMode="single"
                    selectedKeys={new Set([selected])}
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0];
                        if (key !== undefined) setSelected(String(key)); // приведение к string
                    }}
                    className={menuClassName}
                    style={{ 
                        width: menuWidth
                     }}
                >
                    {options.map((item) => (
                        <DropdownItem key={item} className={`hover:bg-[#F4F6FB] rounded-[8px] ${itemClassName}`}>
                            {item}
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
        </div>
    );
};


