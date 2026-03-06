"use client"
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@heroui/button"
import Slider from "rc-slider";
import { CheckboxGroup, Checkbox } from "@heroui/react";
import Image from "next/image";
import "rc-slider/assets/index.css";

export default function Hypothec() {
    const [initialPayment, setInitialPayment] = useState<number>(325000); // диапазон
    const [loanPeriod, setLoanPeriod] = useState<number>(12); // диапазон
    const [selected, setSelected] = useState<string[]>(["Indirect"]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const items = [
        { id: "Indirect", label: "Косвянное подтверждение дохода" },
        { id: "Deposit", label: "С залогом" },
        { id: "Otbasy", label: "Есть депозит в Отбасы банк" },
    ];
    const sliders = [
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

    const toggle = (id: string) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((v) => v !== id)
                : [...prev, id]
        );
    };

    const mortgageOptions = [
        {
            id: 1,
            bankTitle: "Halyk ипотека",
            bankSubtitle: "Заявка через брокер",
            bankLogo: "/img/halyk.png",

            rate: "15.5%",
            term: "20 лет",
            price: "31 032 351 ₸",

            monthlyTitle: "Платеж в месяц",
            monthlyValue: "∼ 232 351 ₸/мес",

            details: [
                { label: "ГЭСВ", value: "16.64%" },
                { label: "Переплата", value: "79 052 636 ₸" },
                { label: "Сумма займа", value: "30 032 351 ₸" },
            ],
        },
        {
            id: 2,
            bankTitle: "Оңай ипотека",
            bankSubtitle: "Altyn Bank",
            bankLogo: "/img/altyn.png",

            rate: "15.5%",
            term: "20 лет",
            price: "31 032 351 ₸",

            monthlyTitle: "Платеж в месяц",
            monthlyValue: "∼ 232 351 ₸/мес",

            details: [
                { label: "ГЭСВ", value: "16.64%" },
                { label: "Переплата", value: "79 052 636 ₸" },
                { label: "Сумма займа", value: "30 032 351 ₸" },
            ],
        },
        {
            id: 3,
            bankTitle: "Цифровая Ипотека",
            bankSubtitle: "Freedom Bank",
            bankLogo: "/img/freedom.png",

            rate: "15.5%",
            term: "20 лет",
            price: "31 032 351 ₸",

            monthlyTitle: "Платеж в месяц",
            monthlyValue: "∼ 232 351 ₸/мес",

            details: [
                { label: "ГЭСВ", value: "16.64%" },
                { label: "Переплата", value: "79 052 636 ₸" },
                { label: "Сумма займа", value: "30 032 351 ₸" },
            ],
        },
    ];

    const toggleExpand = (id: number) => {
        setExpanded(prev => {
            const currentState = typeof prev === 'object' && prev !== null ? prev : {};
            return {
                ...currentState,
                [id]: !currentState[id],
            };
        });
    };

    return (
        <div className="flex flex-col items-start gap-[24px] self-stretch">
            <div className="flex flex-col items-start gap-[24px] self-stretch">
                {sliders.map(({ label, value, setValue, min, max, step }, index) => (
                    <div key={index} className="flex w-full flex-col items-start gap-[4px]">
                        <p className="overflow-hidden overflow-ellipsis text-[12px] not-italic font-normal leading-[normal] text-[#132C5E]">{label}</p>
                        <div className="flex flex-col justify-center items-center self-stretch">
                            <div className="flex items-center self-stretch">
                                <p className="flex items-start gap-[4px] flex-[1_0_0] bg-[#F4F6FB] rounded-[12px] p-[11px] overflow-hidden overflow-ellipsis text-[15px] not-italic font-normal leading-[20px] text-[#132C5E]"> {value}</p>
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
                <div className="flex items-start gap-[12px] self-stretch">
                    <Button className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center flex-[1_0_0] rounded-[16px] bg-[#1A3C7E]">
                        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">Аннуитет</span>
                    </Button>
                    <Button className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center flex-[1_0_0] rounded-[16px] bg-[#F4F5F9]">
                        <span className="text-[#000] text-[15px] not-italic font-medium leading-[20px]">Равными долями</span>
                    </Button>
                </div>
                <div className="self-stretch flex flex-col gap-2">
                    {items.map((item) => {
                        const isSelected = selected.includes(item.id);

                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => toggle(item.id)}
                                className={`self-stretch h-11 min-w-11 min-h-11 px-3 py-2.5 rounded-xl inline-flex justify-start items-center gap-2 transition-colors
              ${isSelected ? "bg-[#1A3C7E]/10" : "bg-slate-100"}
            `}
                            >
                                {isSelected ? (
                                    // Checked icon
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M14.6666 7.99967C14.6666 11.6816 11.6818 14.6663 7.99992 14.6663C4.31802 14.6663 1.33325 11.6816 1.33325 7.99967C1.33325 4.31778 4.31802 1.33301 7.99992 1.33301C11.6818 1.33301 14.6666 4.31778 14.6666 7.99967ZM10.6868 5.97945C10.8821 6.17472 10.8821 6.4913 10.6868 6.68656L7.35347 10.0199C7.15821 10.2152 6.84163 10.2152 6.64637 10.0199L5.31303 8.68656C5.11777 8.4913 5.11777 8.17472 5.31303 7.97945C5.50829 7.78419 5.82488 7.78419 6.02014 7.97945L6.99992 8.95923L8.48981 7.46934L9.9797 5.97945C10.175 5.78419 10.4915 5.78419 10.6868 5.97945Z"
                                            fill="#1C274C"
                                        />
                                    </svg>
                                ) : (
                                    // Unchecked icon
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                                        <circle cx="8" cy="8" r="6.5" stroke="#132C5E" fill="none" />
                                    </svg>
                                )}

                                <span className="flex-1 text-xs font-medium leading-5 text-left">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col items-start gap-[16px] self-stretch">
                <span className="text-[#122C5E] text-[20px] not-italic font-normal leading-[100%] opacity-50">
                    Доступные программы
                </span>
                <div className="flex flex-col items-start gap-[16px] self-stretch">
                    {mortgageOptions.map((item) => (
                        <div key={item.id} className="flex h-full p-[16px] flex-col items-start gap-[24px] self-stretch rounded-[16px] bg-[#F4F6FB]">
                            {/* Header */}
                            <div className="flex w-full max-w-[368px] h-[71px] items-center gap-[12px]">
                                <div className="flex h-[66px] p-[8px] justify-center items-center rounded-[8px] bg-white">
                                    <Image src={item.bankLogo} width={50} height={50} alt="bank" />
                                </div>

                                <div className="flex flex-col gap-[4px]">
                                    <span className="text-[20px] leading-[24px]">{item.bankTitle}</span>
                                    <p className="text-[16px] opacity-50">{item.bankSubtitle}</p>
                                </div>
                            </div>

                            {/* Three columns */}
                            <div className="flex items-start gap-[16px] self-stretch w-full">
                                <div className="w-full">
                                    <p className="text-[14px] opacity-50">Ставка:</p>
                                    <span className="text-[#1A3C7E]">{item.rate}</span>
                                </div>

                                <div className="w-full">
                                    <p className="text-[14px] opacity-50">Срок</p>
                                    <span className="text-[#1A3C7E]">{item.term}</span>
                                </div>

                                <div className="w-full">
                                    <p className="text-[14px] opacity-50">Цена в ипотеку</p>
                                    <span className="text-[#1A3C7E]">{item.price}</span>
                                </div>
                            </div>

                            {/* Monthly */}
                            <div className="flex justify-between w-full">
                                <span className="text-[#2655AF]">{item.monthlyTitle}</span>
                                <span className="text-[#2655AF]">{item.monthlyValue}</span>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-[12px] w-full">
                                <Button className="flex-1 bg-[#1A3C7E] text-white rounded-[12px]">
                                    Подать заявку на ипотеку
                                </Button>

                                <Button
                                    key={item.id}
                                    onPress={() => toggleExpand(item.id)}
                                    className="bg-[#F4F5F9] rounded-[12px] flex items-center gap-[6px]"
                                >
                                    Подробнее
                                    <svg
                                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                    >
                                        <path d="M12.6666 6L7.99992 10L3.33325 6" stroke="#1C274C" strokeWidth="1.5" />
                                    </svg>
                                </Button>
                            </div>

                            {/* Expandable block */}
                           <div
                                className={`w-full overflow-hidden transition-all duration-300 ${expanded[item.id] ? "max-h-[500px] opacity-100 mt-[12px]" : "max-h-0 opacity-0"
                                    }`}
                            >
                                <div className="flex flex-col gap-[8px]">

                                    {item.details.map((detail, idx) => (
                                        <div
                                            key={idx}
                                            className="flex py-[8px] justify-between border-b border-[rgba(38,85,175,0.16)]"
                                        >
                                            <span>{detail.label}</span>
                                            <span>{detail.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div
                                className={`flex items-center gap-[5px] self-stretch p-0 w-full overflow-hidden transition-all duration-300 ${expanded[item.id] ? "max-h-[500px] opacity-100 mt-[12px]" : "max-h-0 opacity-0"
                                    }`}
                            >
                                <Button className="flex px-[11px] py-[9px] rounded-[12px] bg-[#F4F5F9] gap-[6px]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8.36902 11.0041C8.27429 11.1077 8.14038 11.1667 8 11.1667C7.85962 11.1667 7.72571 11.1077 7.63099 11.0041L4.96432 8.08738C4.77799 7.88358 4.79215 7.56732 4.99595 7.38099C5.19975 7.19465 5.51602 7.20881 5.70235 7.41262L7.5 9.3788V2C7.5 1.72386 7.72386 1.5 8 1.5C8.27614 1.5 8.5 1.72386 8.5 2V9.3788L10.2977 7.41262C10.484 7.20881 10.8003 7.19465 11.0041 7.38099C11.2079 7.56732 11.222 7.88358 11.0357 8.08738L8.36902 11.0041Z" fill="#132C5E" />
                                        <path d="M2.5 10C2.5 9.72386 2.27614 9.5 2 9.5C1.72386 9.5 1.5 9.72386 1.5 10V10.0366C1.49999 10.9483 1.49998 11.6832 1.57768 12.2612C1.65836 12.8612 1.83096 13.3665 2.23223 13.7678C2.63351 14.169 3.13876 14.3416 3.73883 14.4223C4.31681 14.5 5.05169 14.5 5.96342 14.5H10.0366C10.9483 14.5 11.6832 14.5 12.2612 14.4223C12.8612 14.3416 13.3665 14.169 13.7678 13.7678C14.169 13.3665 14.3416 12.8612 14.4223 12.2612C14.5 11.6832 14.5 10.9483 14.5 10.0366V10C14.5 9.72386 14.2761 9.5 14 9.5C13.7239 9.5 13.5 9.72386 13.5 10C13.5 10.9569 13.4989 11.6244 13.4312 12.1279C13.3655 12.6171 13.2452 12.8762 13.0607 13.0607C12.8762 13.2452 12.6171 13.3655 12.1279 13.4312C11.6244 13.4989 10.9569 13.5 10 13.5H6C5.04306 13.5 4.37565 13.4989 3.87208 13.4312C3.3829 13.3655 3.12385 13.2452 2.93934 13.0607C2.75483 12.8762 2.63453 12.6171 2.56877 12.1279C2.50106 11.6244 2.5 10.9569 2.5 10Z" fill="#132C5E" />
                                    </svg>
                                    Скачать расчеты
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}