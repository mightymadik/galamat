"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger, Calendar } from "@heroui/react";
import Image from "next/image";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "@react-types/calendar";
import type { PaymentConditionForFlat } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";
import {
    PROMO_LENGTH,
    formatPriceDisplay,
    formatMoney,
    formatPromoInput,
    parseRaise,
    resolveDownPaymentAmount,
    parsePriceString,
    getMatchingOptions,
    isActivePaymentStatus,
    isPaymentConditionValidToday,
    isPaymentMethod,
    formatValidToDate,
    formatComplexDueDate,
    resolvePromocodeDiscountValue,
    resolveOptionTotalPrice,
} from "@/lib/paymentFormUtils";
import { useTranslations } from "next-intl";
import type { RealEstateType } from "@/types/flat";

function calendarDateToRu(date: CalendarDate): string {
    const d = String(date.day).padStart(2, "0");
    const m = String(date.month).padStart(2, "0");
    return `${d}.${m}.${date.year}`;
}

function formatAmountInput(value: string): string {
    const digits = (value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    const n = parseInt(digits, 10);
    return Number.isNaN(n) ? "" : n.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

function parseAmount(value: string): number {
    return Number((value ?? "").replace(/\D/g, "")) || 0;
}

function areAmountMapsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}

interface HypothecProps {
    flatData: {
        id?: string | number;
        title?: string;
        images?: string[];
        paymentConditions?: PaymentConditionForFlat[];
        fullPriceBeforeDiscount?: number;
        totalArea?: number;
        room?: string;
        area?: string;
        complexDueDate?: string;
        documentId?: string;
        projectDocumentId?: string;
        section?: string;
        entrance?: string;
        floor?: string;
        floorGroup?: string;
        apartmentNumber?: number;
        house?: number;
        price?: string;
        priceM2?: string;
        sunshine?: string;
        planView?: string;
        loggiaView?: string;
        location?: string;
        riseRow?: number;
        windowView?: string;
    } | null;
    realEstateType?: RealEstateType;
    activeButton: string | null;
    onNext: (payload?: AgreementPayload) => void;
    isSubmitting?: boolean;
}

export default function Hypothec({ flatData, realEstateType = "property", onNext, isSubmitting = false }: HypothecProps) {
    const t = useTranslations();
    const isResidential = realEstateType === "property";
    const unitLabel = realEstateType === "commerce" ? "Коммерция" : realEstateType === "parking" ? "Паркинг" : realEstateType === "pantry" ? "Кладовка" : "Квартира";
    const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
    const [selectedPaymentDates, setSelectedPaymentDates] = useState<CalendarDate[]>(() => [today(getLocalTimeZone())]);
    const [amountByDateKey, setAmountByDateKey] = useState<Record<string, string>>({});
    const [promocodeInput, setPromocodeInput] = useState<string>("");
    const lastValidatedCodeRef = useRef<string>("");
    const [promocodeResult, setPromocodeResult] = useState<{ valid: boolean; value?: number; code?: string; error?: string } | null>(null);

    const parsedArea = typeof flatData?.area === "string"
        ? parseFloat(flatData.area.replace(/[^\d.,]/g, "").replace(",", "."))
        : 0;
    const totalArea = flatData?.totalArea && flatData.totalArea > 0 ? flatData.totalArea : (Number.isFinite(parsedArea) ? parsedArea : 0);
    const basePrice = (flatData?.fullPriceBeforeDiscount && flatData.fullPriceBeforeDiscount > 0)
        ? flatData.fullPriceBeforeDiscount
        : parsePriceString(flatData?.price);
    const todayCalendarDate = useMemo(() => today(getLocalTimeZone()), []);

    const conditions = (flatData?.paymentConditions || []).filter(
        (c) => isPaymentMethod(c, "hypothec") && isActivePaymentStatus(c) && isPaymentConditionValidToday(c)
    );
    const flatAttrs = {
        room: flatData?.room,
        totalArea,
        section: flatData?.section,
        entrance: flatData?.entrance,
        floor: flatData?.floor,
        floorGroup: flatData?.floorGroup,
        apartmentNumber: flatData?.apartmentNumber,
    };
    const programs = conditions
        .map((c, idx) => {
            const baseOptions = (c.paymentCondition || []);
            const matched = getMatchingOptions(baseOptions as Parameters<typeof getMatchingOptions>[0], flatAttrs);
            const effectiveOptions = matched.length > 0 ? matched : baseOptions;
            return {
                key: c.documentId || `${c.banks || "bank"}-${c.hypothec || "program"}-${idx}`,
                bank: c.banks || "Банк",
                programName: c.hypothec || "Ипотечная программа",
                validTo: c.validTo ?? null,
                options: effectiveOptions,
            };
        })
        .filter((x): x is { key: string; bank: string; programName: string; validTo: string | null; options: NonNullable<typeof x>["options"] } => x != null);
    const selectedProgram = programs[Math.min(selectedProgramIndex, Math.max(0, programs.length - 1))] ?? programs[0];
    const adjustmentArea = realEstateType === "parking" ? 0 : totalArea;
    const options = selectedProgram?.options ?? [];
    const selectedOption = options[0];
    const raiseRaw = parseRaise(selectedOption?.raise);
    const raiseAmount = resolveOptionTotalPrice(basePrice, adjustmentArea, selectedOption) - basePrice;
    const raisePerSquareAmount = (() => {
        return totalArea > 0 ? Math.round(raiseAmount / totalArea) : 0;
    })();
    const totalPriceBeforeDiscounts = Math.max(0, basePrice + raiseAmount);
    const promocodeDiscount = promocodeResult?.valid
        ? resolvePromocodeDiscountValue(promocodeResult?.value, totalPriceBeforeDiscounts, adjustmentArea)
        : 0;
    const totalPrice = Math.max(0, totalPriceBeforeDiscounts - promocodeDiscount);
    const defaultDownFromProgram = resolveDownPaymentAmount(selectedOption?.downPayment, totalPrice);
    const minDownPayment = Math.max(0, defaultDownFromProgram);
    const enteredDownAmount = Object.values(amountByDateKey).reduce((acc, val) => acc + parseAmount(val), 0);
    const sliderMinValue = minDownPayment;
    const sliderMaxValue = Math.max(Math.round(totalPrice), sliderMinValue);
    const sliderValue = Math.min(Math.max(enteredDownAmount, sliderMinValue), sliderMaxValue);
    const loanAmount = Math.max(0, totalPrice - enteredDownAmount);
    const totalSumM2 = totalArea > 0 ? totalPrice / totalArea : 0;
    const totalSumM2Display = formatPriceDisplay(Math.round(totalSumM2)) + "/м²";
    const validToDate = selectedProgram?.validTo ? new Date(String(selectedProgram.validTo).replace(" ", "T")) : null;
    const validToFormatted = formatValidToDate(selectedProgram?.validTo);
    const now = today(getLocalTimeZone());
    const endDate = useMemo(
        () => (validToDate && !Number.isNaN(validToDate.getTime())
            ? new CalendarDate(validToDate.getFullYear(), validToDate.getMonth() + 1, validToDate.getDate())
            : new CalendarDate(now.year + 1, now.month, now.day)),
        [validToDate?.getTime(), now.year, now.month, now.day]
    );

    const sortedPaymentDates = useMemo(
        () => [...selectedPaymentDates].filter((d) => d.compare(todayCalendarDate) >= 0 && d.compare(endDate) <= 0).sort((a, b) => a.compare(b)),
        [selectedPaymentDates, todayCalendarDate, endDate]
    );
    const enteredDownAmountShortage = Math.max(0, minDownPayment - enteredDownAmount);

    const splitDownPaymentAcrossDates = useCallback((dates: CalendarDate[], total: number): Record<string, string> => {
        if (!dates.length || total <= 0) return {};
        const safeTotal = Math.max(0, Math.round(total));
        const basePart = Math.floor(safeTotal / dates.length);
        let remainder = safeTotal - basePart * dates.length;
        const next: Record<string, string> = {};
        dates.forEach((d) => {
            const key = calendarDateToRu(d);
            const extra = remainder > 0 ? 1 : 0;
            if (remainder > 0) remainder -= 1;
            next[key] = formatAmountInput(String(basePart + extra));
        });
        return next;
    }, []);

    useEffect(() => {
        if (!sortedPaymentDates.length) return;
        setAmountByDateKey((prev) => {
            const existingSum = sortedPaymentDates.reduce((acc, d) => acc + parseAmount(prev[calendarDateToRu(d)] ?? "0"), 0);
            const target = Math.max(
                sliderMinValue,
                Math.min(sliderMaxValue, existingSum > 0 ? existingSum : sliderMinValue)
            );
            const next = splitDownPaymentAcrossDates(sortedPaymentDates, target);
            return areAmountMapsEqual(prev, next) ? prev : next;
        });
    }, [sortedPaymentDates, sliderMinValue, sliderMaxValue, splitDownPaymentAcrossDates]);

    const onPaymentDayToggle = (date: DateValue) => {
        const cd = "day" in date ? date : (date as CalendarDate);
        if ((cd as CalendarDate).compare(todayCalendarDate) < 0) return;
        if ((cd as CalendarDate).compare(endDate) > 0) return;
        setSelectedPaymentDates((prev) => {
            const next = prev.filter((d) => d.compare(cd as CalendarDate) !== 0);
            if (next.length === prev.length) next.push(cd as CalendarDate);
            return next.sort((a, b) => a.compare(b));
        });
    };

    const removePaymentDate = (date: CalendarDate) => {
        const key = calendarDateToRu(date);
        setSelectedPaymentDates((prev) => prev.filter((d) => d.compare(date) !== 0));
        setAmountByDateKey((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleNext = () => {
        if (sortedPaymentDates.length === 0) return;
        if (enteredDownAmount < minDownPayment) return;
        const paymentSchedule = sortedPaymentDates.map((d, i) => ({
            index: i + 1,
            date: calendarDateToRu(d),
            sum: formatPriceDisplay(parseAmount(amountByDateKey[calendarDateToRu(d)] ?? "0")),
        }));
        onNext({
            paymentMethod: "hypothec",
            totalSum: totalPrice,
            totalSumM2: totalArea > 0 ? Math.round(totalPrice / totalArea) : 0,
            paymentSchedule: [
                ...paymentSchedule,
                {
                    index: paymentSchedule.length + 1,
                    date: validToFormatted || calendarDateToRu(endDate),
                    sum: formatPriceDisplay(Math.max(0, loanAmount)),
                },
            ],
            agreementProjectDueDate: validToFormatted || "",
            propertyDocumentId: flatData?.documentId,
            usedPromocodeCode: promocodeResult?.valid ? promocodeResult.code : undefined,
            hypothecBank: selectedProgram?.bank,
            hypothecProgram: selectedProgram?.programName,
            paymentConditionDownPaymentRaw: selectedOption?.downPayment ?? undefined,
            downPaymentAmount: Math.max(0, enteredDownAmount),
        });
    };

    useEffect(() => {
        const code = formatPromoInput(promocodeInput);
        if (code.length < PROMO_LENGTH) {
            lastValidatedCodeRef.current = "";
            setPromocodeResult(null);
            return;
        }
        if (code.length !== PROMO_LENGTH || code === lastValidatedCodeRef.current || !flatData?.projectDocumentId) return;
        setPromocodeResult(null);
        const flatPayload = {
            apartmentNumber: flatData.apartmentNumber,
            house: flatData.house,
            section: flatData.section,
            entrance: flatData.entrance,
            floor: flatData.floor,
            room: flatData.room,
            sunshine: flatData.sunshine,
            planView: flatData.planView,
            floorGroup: flatData.floorGroup,
            loggiaView: flatData.loggiaView,
            location: flatData.location,
            riseRow: flatData.riseRow,
            windowView: flatData.windowView,
        };
        fetch("/api/promocodes/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code,
                projectDocumentId: flatData.projectDocumentId,
                objectDocumentId: flatData.documentId,
                flat: flatPayload,
                payment: "Hypothec",
                realEstateType,
            }),
        })
            .then((res) => res.json())
            .then((data: { valid?: boolean; value?: number; code?: string; error?: string }) => {
                lastValidatedCodeRef.current = code;
                setPromocodeResult({
                    valid: !!data.valid,
                    value: data.value,
                    code: data.code,
                    error: data.error,
                });
            })
            .catch(() => {
                setPromocodeResult({ valid: false, error: t("code_verification_error") });
            });
    }, [promocodeInput, flatData?.projectDocumentId, flatData?.documentId, flatData?.apartmentNumber, flatData?.house, flatData?.section, flatData?.entrance, flatData?.floor, flatData?.room, realEstateType, t]);

    return (
        <div className="flex flex-col items-start gap-[16px] self-stretch">
            <div className="flex w-full h-full max-h-[168px] p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                <div className="flex h-full max-h-[168px] justify-between items-center self-stretch gap-[36px]">
                    {flatData?.images?.[0] ? (
                        <div className="flex p-[10px] flex-col items-start gap-[10px] rounded-[16px] bg-[#FFF]">
                            <Image
                                rel="preload"
                                src={flatData.images[0]}
                                alt={flatData?.id?.toString() || "no-image"}
                                width={130}
                                height={116}
                                className="max-w-[200px] max-h-[200px] h-full w-full"
                            />
                        </div>
                    ) : (
                        <div className="w-[130px] h-[116px] bg-gray-200 rounded-[12px] flex items-center justify-center p-1">
                            <span className="text-gray-500 text-center">{t("no_image")}</span>
                        </div>
                    )}
                    <div className="flex w-full flex-col justify-between items-start self-stretch">
                        <div className="flex justify-between items-start self-stretch">
                            <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[24px]">{flatData?.title || ""}</h1>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px] opacity-30">№{flatData?.apartmentNumber || ""}</span>
                        </div>
                        <div className="flex justify-between items-start self-stretch">
                            <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">
                                {isResidential ? `${flatData?.room || ""} ${t("rooms")}` : unitLabel}
                            </h1>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.area || ""}</span>
                        </div>
                        <div className="flex items-end gap-[5px] self-stretch">
                            <h1 className="text-[#2655AF] text-[20px] not-italic font-medium leading-[16px]">{formatPriceDisplay(totalPrice)}</h1>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-start gap-[16px] self-stretch">
                <div className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex items-start self-stretch">
                        <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("characteristics")}</h1>
                    </div>
                    <div className="flex flex-col items-start gap-[8px] self-stretch">
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("residential_complex")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.title || ""}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("house")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.house || ""}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("due_date")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                                {formatComplexDueDate(flatData?.complexDueDate, { quarterLabel: t("quarter") }) || ""}
                            </span>
                        </div>
                        {Boolean(flatData?.section) && (
                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("section")}</span>
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.section || ""}</span>
                            </div>
                        )}
                        {Boolean(flatData?.entrance) && (
                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("entrance")}</span>
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.entrance || ""}</span>
                            </div>
                        )}
                        {isResidential && Boolean(flatData?.floor) && (
                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("floor")}</span>
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.floor || ""}</span>
                            </div>
                        )}
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("apartment_price")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(totalPrice)}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
                <Input
                    type="text"
                    label="Промокод"
                    value={promocodeInput}
                    inputMode="text"
                    autoComplete="off"
                    onValueChange={(v) => setPromocodeInput(formatPromoInput(v))}
                    variant="flat"
                    placeholder=""
                    maxLength={PROMO_LENGTH}
                    isInvalid={promocodeResult !== null && !promocodeResult.valid && !!promocodeResult.error}
                    classNames={{
                        base: `w-full bg-[#F4F6FB] rounded-[16px] px-[16px] py-[8px] ${promocodeResult?.valid === false ? "bg-danger-50" : "bg-[#F4F6FB]"}`,
                        label: "text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70 pb-[8px]",
                        input: "!text-[#1A3C7E] text-[20px] font-medium leading-[24px] uppercase",
                        inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:!bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                        innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                    }}
                />
                {promocodeResult?.valid === false && promocodeResult?.error != null && (
                    <p className="text-danger-500 text-[14px] font-normal leading-[20px] opacity-90">
                        {promocodeResult.error}
                    </p>
                )}
            </div>
            {programs.length > 0 && (
                <div className="flex flex-col gap-2 self-stretch">
                    <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">
                        {t("available_hypothec_programs")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {programs.map((p, i) => {
                            const isSelected = selectedProgramIndex === i;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedProgramIndex(i);
                                    }}
                                    className={`flex w-full flex-col gap-1 px-6 py-4 rounded-[32px] text-[14px] leading-5 font-medium transition-colors ${isSelected ? "bg-[#1A3C7E] text-white" : "bg-[#f4f6fb] text-[#2655AF] border border-[#1A3C7E]/30"}`}
                                >
                                    {p.bank}
                                    <div className={`text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80 ${isSelected ? "text-white" : "text-[#2655AF]"}`}>
                                        {p.programName}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="flex w-full p-[32px] flex-col items-start gap-[16px] rounded-[32px] bg-[#F4F6FB]">
                <div className="flex items-start self-stretch">
                    <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("hypothec_payment_conditions")}</h1>
                </div>
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("apartment_price")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(totalPrice)}</span>
                    </div>
                    {realEstateType !== "parking" && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
                        </div>
                    )}
                    {sortedPaymentDates.length > 0 && (
                        <div className="flex flex-col gap-2 px-[0] py-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[16px] text-[#000] opacity-80">
                                {t("down_payment_by_program")}: {formatMoney(sliderValue)}
                            </span>
                            <div className="w-full">
                                <Slider
                                    min={sliderMinValue}
                                    max={sliderMaxValue}
                                    step={1000}
                                    value={sliderValue}
                                    onChange={(v) => {
                                        if (!sortedPaymentDates.length) return;
                                        const nextRaw = Number(v) || sliderMinValue;
                                        const nextBounded = Math.max(sliderMinValue, Math.min(sliderMaxValue, nextRaw));
                                        setAmountByDateKey(splitDownPaymentAcrossDates(sortedPaymentDates, nextBounded));
                                    }}
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
                    )}
                    <div className="flex items-center justify-between w-full flex-row gap-3 self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] py-[8px]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("payment_schedule")}
                        </span>
                        <Popover placement="bottom-end">
                            <PopoverTrigger>
                                <Button size="sm" className="self-start flex h-[32px] rounded-[12px] bg-[#2655AF] text-white">
                                    + {t("add_date")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Calendar
                                    aria-label={t("select_payment_dates")}
                                    value={sortedPaymentDates[0] ?? today(getLocalTimeZone())}
                                    onChange={onPaymentDayToggle}
                                    minValue={todayCalendarDate}
                                    maxValue={endDate}
                                    classNames={{
                                        header: "disabled",
                                        base: "bg-transparent",
                                        gridBody: "bg-[#F4F6FB]",
                                    }}
                                />
                                <p className="text-[#122C5E] text-[12px] opacity-70 px-2 pb-2">
                                    {t("hypothec_until")} {calendarDateToRu(endDate)}
                                </p>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2 self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] py-[8px]">
                        {sortedPaymentDates.map((d) => {
                            const dateKey = calendarDateToRu(d);
                            return (
                                <div
                                    key={dateKey}
                                    className="flex justify-between flex-wrap items-center gap-2"
                                >
                                    <span className="text-[#1A3C7E] text-[14px] font-medium min-w-[90px]">
                                        {dateKey}
                                    </span>
                                    <div className="flex items-center gap-2 justify-end">
                                        <Input
                                            size="sm"
                                            type="text"
                                            inputMode="numeric"
                                            value={amountByDateKey[dateKey] ?? ""}
                                            onValueChange={(v) => {
                                                const normalized = formatAmountInput(v ?? "");
                                                setAmountByDateKey((prev) => {
                                                    const capTotal = Math.max(0, Math.round(totalPrice));
                                                    const keys = sortedPaymentDates.map((d) => calendarDateToRu(d));
                                                    const nextNumbers: Record<string, number> = {};
                                                    keys.forEach((key) => {
                                                        nextNumbers[key] = parseAmount(prev[key] ?? "0");
                                                    });
                                                    nextNumbers[dateKey] = parseAmount(normalized);

                                                    let overflow = Object.values(nextNumbers).reduce((acc, value) => acc + value, 0) - capTotal;
                                                    if (overflow > 0) {
                                                        for (const key of keys) {
                                                            if (key === dateKey || overflow <= 0) continue;
                                                            const reducible = Math.min(nextNumbers[key], overflow);
                                                            nextNumbers[key] -= reducible;
                                                            overflow -= reducible;
                                                        }
                                                        if (overflow > 0) {
                                                            nextNumbers[dateKey] = Math.max(0, nextNumbers[dateKey] - overflow);
                                                        }
                                                    }

                                                    const next: Record<string, string> = { ...prev };
                                                    keys.forEach((key) => {
                                                        next[key] = formatAmountInput(String(nextNumbers[key] ?? 0));
                                                    });
                                                    return next;
                                                });
                                            }}
                                            placeholder="0"
                                            classNames={{
                                                base: "max-w-[180px] bg-[#FFF] rounded-[12px]",
                                                input: "text-[16px] text-right",
                                                inputWrapper: "shadow-none",
                                            }}
                                            endContent={<span className="text-[12px] text-[#666]">₸</span>}
                                        />
                                        {sortedPaymentDates.length > 1 && (
                                            <button
                                                type="button"
                                                aria-label={t("remove_date")}
                                                className="p-1 rounded hover:bg-black/10 text-[#666]"
                                                onClick={() => removePaymentDate(d)}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3 3l10 10M13 3L3 13" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {enteredDownAmountShortage > 0 ? (
                            <span className="text-[12px] text-red-600">
                                {t("minimum_initial_payment")}: {formatMoney(enteredDownAmountShortage)}
                            </span>
                        ) : (
                            <span className="text-[12px] text-[#000] opacity-80">
                                {t("overpayment_of_the_minimum_payment")}: {formatMoney(Math.max(0, enteredDownAmount - minDownPayment))}
                            </span>
                        )}
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("raise_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(raisePerSquareAmount)}</span>
                    </div>
                    {promocodeResult?.valid && promocodeResult?.code != null && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                                Промокод <span className="text-[#2655AF] font-medium">{promocodeResult.code}</span>
                            </span>
                            <span className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">
                                {formatPriceDisplay(promocodeDiscount)}
                            </span>
                        </div>
                    )}
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("hypothec_until")} {validToFormatted ? ` ${validToFormatted}` : ""}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(Math.max(0, loanAmount))}</span>
                    </div>
                </div>
            </div>
            <Button
                onPress={handleNext}
                isDisabled={isSubmitting || enteredDownAmount < minDownPayment || sortedPaymentDates.length === 0}
                isLoading={isSubmitting}
                className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
            >
                <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{isSubmitting ? t("saving") : t("next")}</span>
            </Button>
        </div>
    );
}