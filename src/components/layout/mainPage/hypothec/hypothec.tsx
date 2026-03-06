"use client";
import Image from "next/image";
import { Input } from "@heroui/react";
import React, { useRef, useState, useEffect } from "react";
import {
    Button,
    ButtonGroup,
} from "@heroui/button";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownSection,
    DropdownItem
} from "@heroui/dropdown";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export default function Hypothec() {
    const [selectedValues, setSelectedValues] = useState({
        Property: "Все",
        complex: "Все",
    });

    const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
    const togglePropertyDropdown = () => setIsPropertyDropdownOpen(!isPropertyDropdownOpen);

    const [priceValue, setPriceValue] = useState<number>(20000000); // одно число
    const [initialPayment, setInitialPayment] = useState<number>(325000); // диапазон
    const [loanPeriod, setLoanPeriod] = useState<number>(12); // диапазон

    const contentRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);


    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const selectors = [
        {
            label: "Выберите ЖК",
            items: ["Все", "Gala One", "Galaxy Star", "Burabay Garden Village"],
            selected: selectedValues.Property,
            onSelect: (val: string) =>
                setSelectedValues((prev) => ({ ...prev, Property: val })),
            isOpen: isPropertyDropdownOpen,
            toggleOpen: togglePropertyDropdown,
        },
    ];


    const sliders = [
        {
            label: "Стоимость, ₸",
            value: priceValue,
            setValue: setPriceValue,
            min: 20000000,
            max: 50000000,
            step: 10000,
        },
        {
            label: "Первоначальный взнос, ₸",
            value: initialPayment,
            setValue: setInitialPayment,
            min: 3250000,
            max: 5000000,
            step: 1000,
        },
        {
            label: "Cрок кредитования",
            value: loanPeriod,
            setValue: setLoanPeriod,
            min: 12,
            max: 64,
            step: 1,
        },
    ];

    const bankOffers = [
        {
            img: "/img/freedom.png",
            title: "Зеленая ипотека",
            initialPayment: "20%",
            loanPeriod: "от 3 до 25 лет",
            maxSum: "50 млн ₸",
        },
        {
            img: "/img/otbasy.png",
            title: "Семейная ипотека",
            initialPayment: "20%",
            loanPeriod: "от 3 до 25 лет",
            maxSum: "50 млн ₸",
        },
        {
            img: "/img/freedom.png",
            title: "Ипотека для бизнеса",
            initialPayment: "20%",
            loanPeriod: "от 3 до 25 лет",
            maxSum: "50 млн ₸",
        },
        {
            img: "/img/freedom.png",
            title: "Ипотека для бизнеса",
            initialPayment: "20%",
            loanPeriod: "от 3 до 25 лет",
            maxSum: "50 млн ₸",
        },
    ];

    const handleScroll = () => {
        if (!contentRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = contentRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    };

    useEffect(() => {
        const current = contentRef.current;
        if (current) {
            current.addEventListener("scroll", handleScroll);
            handleScroll();
        }
        return () => current?.removeEventListener("scroll", handleScroll);
    }, []);

    const [isScrolling, setIsScrolling] = useState(false);

    const scroll = (dir: "left" | "right") => {
        if (!contentRef.current || isScrolling) return;

        const scrollAmount = 320; // ширина одной карточки + gap
        setIsScrolling(true);

        contentRef.current.scrollBy({
            left: dir === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });

        // сброс флага через 400мс (примерно длительность скролла)
        setTimeout(() => setIsScrolling(false), 400);
    };


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
        <div className="py-[40px]">
            <div className="wrapper flex p-[32px] flex-col items-start gap-[40px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                <div className="flex items-end gap-[32px] flex-shrink-0 self-stretch">
                    <div className="flex flex-col justify-center items-start gap-[16px] flex-[1_0_0] self-stretch">
                        <h1 className="text-[#282D3C] text-[32px] not-italic font-medium leading-[100%]">Ипотека от 7%</h1>
                        <p className="text-[#282D3C] text-[20px] not-italic font-normal leading-[100%]">Самые выгодные и субсидируемые государством условия для наших клиентов</p>
                    </div>
                    <div className="hidden lg:flex h-[72px] items-center gap-[16px]">
                        <Button
                            onClick={() => scroll("left")}
                            disabled={!canScrollLeft}
                            className={`flex items-center w-[72px] h-[72px] px-[18px] py-[36px] flex-col gap-[10px] rounded-[24px] bg-[#FFF] transition-colors ${canScrollLeft ? "opacity-100" : "opacity-40 cursor-default"
                                }`}
                        >
                            <svg
                                className={`h-[37px] flex-shrink-0 stroke-[0.1px] ${canScrollLeft ? "fill-[#1A3C7E] stroke-[#282D3C]" : "fill-[#8C94A8] stroke-[#C2C7D1]"
                                    }`}
                                xmlns="http://www.w3.org/2000/svg"
                                width="38"
                                height="21"
                                viewBox="0 0 38 21"
                                fill="none"
                            >
                                <path d="M0.416996 11.4943C-0.13916 10.9382 -0.13916 10.0365 0.416996 9.4803L9.48007 0.417218C10.0362 -0.138938 10.9379 -0.138938 11.4941 0.417218C12.0502 0.973373 12.0502 1.87508 11.4941 2.43124L3.43802 10.4873L11.4941 18.5434C12.0502 19.0995 12.0502 20.0012 11.4941 20.5574C10.9379 21.1135 10.0362 21.1135 9.48007 20.5574L0.416996 11.4943ZM37.7158 10.4873V11.9114H1.424V10.4873V9.06318H37.7158V10.4873Z" />
                            </svg>
                        </Button>
                        <Button
                            onClick={() => scroll("right")}
                            disabled={!canScrollRight}
                            className={`flex items-center w-[72px] h-[72px] px-[18px] py-[36px] flex-col gap-[10px] rounded-[24px] transition-colors ${canScrollRight ? "bg-[#1A3C7E]" : "bg-[#8C94A8] cursor-default"
                                }`}
                        >
                            <svg
                                className="h-[37px] flex-shrink-0 stroke-[0.1px]"
                                xmlns="http://www.w3.org/2000/svg"
                                width="38"
                                height="21"
                                viewBox="0 0 38 21"
                                fill="none"
                            >
                                <path
                                    d="M37.2988 11.4943C37.855 10.9382 37.855 10.0365 37.2988 9.4803L28.2357 0.417218C27.6796 -0.138938 26.7779 -0.138938 26.2217 0.417218C25.6656 0.973373 25.6656 1.87508 26.2217 2.43124L34.2778 10.4873L26.2217 18.5434C25.6656 19.0995 25.6656 20.0012 26.2217 20.5574C26.7779 21.1135 27.6796 21.1135 28.2357 20.5574L37.2988 11.4943ZM0 10.4873V11.9114H36.2918V10.4873V9.06318H0V10.4873Z"
                                    fill="white"
                                />
                            </svg>
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row items-center gap-[32px] self-stretch items-end">
                    <div className="flex flex-col items-start gap-[32px] w-full max-w-[100%] lg:max-w-[417px]">
                        <div className="flex flex-col justify-center items-start gap-[24px] w-full max-w-[100%] lg:max-w-[417px]">
                            {selectors.map((selector, index) => (
                                <div key={index} className="flex w-full flex-col items-start gap-[4px]">
                                    <p className="overflow-hidden overflow-ellipsis text-[12px] not-italic font-normal leading-[normal] self-stretch text-[#132C5E]">
                                        {selector.label}
                                    </p>
                                    <Dropdown
                                        isOpen={selector.isOpen}
                                        onOpenChange={selector.toggleOpen}
                                        className="flex flex-col items-start gap-[4px] self-stretch"
                                    >
                                        <DropdownTrigger>
                                            <Button
                                                ref={buttonRef}
                                                className="flex justify-between p-[11px] items-center gap-[4px] self-stretch rounded-[12px] bg-[#FFF] overflow-hidden overflow-ellipsis text-[15px] not-italic font-normal leading-[20px]"
                                            >
                                                {selector.selected}
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M12.6663 6L7.99967 10L3.33301 6"
                                                        stroke="#1C274C"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </Button>
                                        </DropdownTrigger>

                                        <DropdownMenu
                                            aria-label={selector.label}
                                            onAction={(key) => selector.onSelect(key as string)}
                                            className="flex flex-col flex-shrink-0 self-stretch bg-[#FFF] p-[11px] rounded-[12px]"
                                            style={{
                                                width: menuWidth,
                                            }}
                                        >
                                            {selector.items.map((item, i) => (
                                                <DropdownItem key={item} className="flex items-start self-stretch p-[11px] hover:bg-[#F4F6FB] rounded-[8px]">{item}</DropdownItem>
                                            ))}
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                            ))}

                            {sliders.map(({ label, value, setValue, min, max, step }, index) => (
                                <div key={index} className="flex w-full flex-col items-start gap-[4px]">
                                    <p className="overflow-hidden overflow-ellipsis text-[12px] not-italic font-normal leading-[normal] text-[#132C5E]">{label}</p>
                                    <div className="flex flex-col justify-center items-center self-stretch">
                                        <div className="flex items-center self-stretch">
                                            <p className="flex items-start gap-[4px] flex-[1_0_0] bg-[#FFF] rounded-[12px] p-[11px] overflow-hidden overflow-ellipsis text-[15px] not-italic font-normal leading-[20px] text-[#132C5E]"> {value}</p>
                                        </div>
                                        <div className="flex px-[16px] py-[0] flex-col items-start gap-[10px] self-stretch h-0">
                                            <Slider
                                                className="bottom-2 w-full"
                                                step={step}
                                                min={min}
                                                max={max}
                                                value={value}
                                                onChange={(v) => setValue(v as number)}
                                                trackStyle={{ backgroundColor: "#1A3C7E", height: 2 }}
                                                handleStyle={{
                                                    borderColor: "#1A3C7E",
                                                    backgroundColor: "#1A3C7E",
                                                    height: 18,
                                                    width: 18,
                                                    marginTop: -7,
                                                }}
                                                railStyle={{ backgroundColor: "#1A3C7E", height: 2 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button className="flex h-[44px] min-w-[44px] min-h-[44px] justify-center items-center self-stretch rounded-[12px] bg-[#1A3C7E] text-white font-regular">
                            Посмотреть предложения
                        </Button>
                    </div>
                    <div className="w-full overflow-hidden lg:overflow-auto">
                        <div
                            ref={contentRef}
                            className="flex justify-start items-center gap-[12px] flex-nowrap flex-[1_0_0]"
                            style={{
                                overflowX: "auto",
                                overflowY: "hidden",
                                scrollbarWidth: "none",
                                WebkitOverflowScrolling: "touch",
                                width: "100%",
                            }}
                        >
                            {bankOffers.map((offer, index) => (
                                <div
                                    key={offer.title + index}
                                    className="flex flex-shrink-0 w-[306px] h-[402px] px-[18px] py-[22px] flex-col items-start gap-[42px] rounded-[24px] bg-[#FFF]"
                                >
                                    <div className="flex flex-col items-start gap-[32px] self-stretch">
                                        <Image src={offer.img} alt={offer.title} width={133} height={40} />
                                        <h1 className="text-[32px] not-italic font-medium leading-[120%]">{offer.title}</h1>
                                    </div>
                                    <div className="flex flex-col items-start gap-[12px]">
                                        <div className="flex flex-col items-start self-stretch">
                                            <p className="text-[#8C94A8] text-[12px] font-normal leading-[15.87px]">Первоначальный взнос</p>
                                            <h2 className="text-[20px] font-medium leading-[23.8px]">{offer.initialPayment}</h2>
                                        </div>
                                        <div className="flex flex-col items-start self-stretch">
                                            <p className="text-[#8C94A8] text-[12px] font-normal leading-[15.87px]">Срок займа</p>
                                            <h2 className="text-[20px] font-medium leading-[23.8px]">{offer.loanPeriod}</h2>
                                        </div>
                                        <div className="flex flex-col items-start self-stretch">
                                            <p className="text-[#8C94A8] text-[12px] font-normal leading-[15.87px]">Максимальная сумма</p>
                                            <h2 className="text-[20px] font-medium leading-[23.8px]">{offer.maxSum}</h2>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex lg:hidden h-[72px] items-center gap-[16px]">
                        <Button
                            onClick={() => scroll("left")}
                            disabled={!canScrollLeft}
                            className={`flex items-center w-[72px] h-[72px] px-[18px] py-[36px] flex-col gap-[10px] rounded-[24px] bg-[#FFF] transition-colors ${canScrollLeft ? "opacity-100" : "opacity-40 cursor-default"
                                }`}
                        >
                            <svg
                                className={`h-[37px] flex-shrink-0 stroke-[0.1px] ${canScrollLeft ? "fill-[#1A3C7E] stroke-[#282D3C]" : "fill-[#8C94A8] stroke-[#C2C7D1]"
                                    }`}
                                xmlns="http://www.w3.org/2000/svg"
                                width="38"
                                height="21"
                                viewBox="0 0 38 21"
                                fill="none"
                            >
                                <path d="M0.416996 11.4943C-0.13916 10.9382 -0.13916 10.0365 0.416996 9.4803L9.48007 0.417218C10.0362 -0.138938 10.9379 -0.138938 11.4941 0.417218C12.0502 0.973373 12.0502 1.87508 11.4941 2.43124L3.43802 10.4873L11.4941 18.5434C12.0502 19.0995 12.0502 20.0012 11.4941 20.5574C10.9379 21.1135 10.0362 21.1135 9.48007 20.5574L0.416996 11.4943ZM37.7158 10.4873V11.9114H1.424V10.4873V9.06318H37.7158V10.4873Z" />
                            </svg>
                        </Button>
                        <Button
                            onClick={() => scroll("right")}
                            disabled={!canScrollRight}
                            className={`flex items-center w-[72px] h-[72px] px-[18px] py-[36px] flex-col gap-[10px] rounded-[24px] transition-colors ${canScrollRight ? "bg-[#1A3C7E]" : "bg-[#8C94A8] cursor-default"
                                }`}
                        >
                            <svg
                                className="h-[37px] flex-shrink-0 stroke-[0.1px]"
                                xmlns="http://www.w3.org/2000/svg"
                                width="38"
                                height="21"
                                viewBox="0 0 38 21"
                                fill="none"
                            >
                                <path
                                    d="M37.2988 11.4943C37.855 10.9382 37.855 10.0365 37.2988 9.4803L28.2357 0.417218C27.6796 -0.138938 26.7779 -0.138938 26.2217 0.417218C25.6656 0.973373 25.6656 1.87508 26.2217 2.43124L34.2778 10.4873L26.2217 18.5434C25.6656 19.0995 25.6656 20.0012 26.2217 20.5574C26.7779 21.1135 27.6796 21.1135 28.2357 20.5574L37.2988 11.4943ZM0 10.4873V11.9114H36.2918V10.4873V9.06318H0V10.4873Z"
                                    fill="white"
                                />
                            </svg>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}