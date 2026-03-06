"use client";

import { Button } from "@heroui/react";
import { Dispatch, SetStateAction } from "react";

interface ReserveOption {
    key: string;
    label: string;
    price: string;
}

interface ReserveProps {
    options: ReserveOption[];
    activeOption: string | null;
    setActiveOption: Dispatch<SetStateAction<string | null>>;
    onNext: () => void;
    /** Блокирует кнопку «Далее» и показывает загрузку */
    isSubmitting?: boolean;
}

export default function Reserve({
    options,
    activeOption,
    setActiveOption,
    onNext,
    isSubmitting = false,
}: ReserveProps) {
    return (
        <div className="self-stretch inline-flex flex-col justify-start items-start gap-6">
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                {options.map(({ key, label, price }) => (
                    <Button
                        key={key}
                        className={`min-h-[56px] self-stretch p-4 rounded-2xl flex flex-col justify-start items-start gap-4 overflow-hidden 
                            ${activeOption === key ? "bg-[#1A3C7E]" : "bg-[#F4F6FB]"}`}
                        onPress={() => setActiveOption(key)}
                    >
                        <div className="self-stretch inline-flex justify-start items-center gap-1">
                            <div className={`flex flex-1 justify-start text-xl font-medium leading-6 ${activeOption === key ? "text-white" : "text-[#1A3C7E]"}`}>
                                {label}
                            </div>
                            <div className="flex justify-end items-center gap-1">
                                <div className={`px-3 py-1 rounded-2xl flex justify-center items-center ${activeOption === key ? "bg-white" : "bg-[#1A3C7E]"}`}>
                                    <div className={`text-center text-xs font-normal leading-4 ${activeOption === key ? "text-[#1A3C7E]" : "text-white"}`}>
                                        {price}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Button>
                ))}
            </div>

            <Button
                onPress={onNext}
                className="self-stretch h-12 min-w-12 px-3.5 pt-3.5 pb-4 bg-[#1A3C7E] rounded-2xl inline-flex justify-center items-center"
                isDisabled={!activeOption || isSubmitting}
                isLoading={isSubmitting}
            >
                <div className="justify-start text-white text-base font-medium leading-5">{isSubmitting ? "Сохранение…" : "Далее"}</div>
            </Button>
        </div>
    );
}
