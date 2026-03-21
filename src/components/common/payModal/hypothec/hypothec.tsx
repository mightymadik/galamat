"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger, Calendar } from "@heroui/react";
import Image from "next/image";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import type { DateValue } from "@react-types/calendar";
import type { PaymentConditionForFlat } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";
import {
    PROMO_LENGTH,
    formatPriceDisplay,
    formatMoney,
    formatPromoInput,
    parseDownPaymentPercent,
    parseRaise,
    parsePriceString,
    getMatchingOptions,
    isActivePaymentStatus,
    isPaymentConditionValidToday,
    isPaymentMethod,
    formatValidToDate,
    formatComplexDueDate,
    resolvePromocodeDiscountValue,
} from "@/lib/paymentFormUtils";
import { useTranslations } from "next-intl";

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
    } | null;
    activeButton: string | null;
    onNext: (payload?: AgreementPayload) => void;
    isSubmitting?: boolean;
}

export default function Hypothec({ flatData, onNext, isSubmitting = false }: HypothecProps) {
    const t = useTranslations();
    const [selectedPvIndex, setSelectedPvIndex] = useState(0);
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
    const todayCalendarDate = today(getLocalTimeZone());

    const conditions = (flatData?.paymentConditions || []).filter(
        (c) => isPaymentMethod(c, "hypothec") && isActivePaymentStatus(c) && isPaymentConditionValidToday(c)
    );
    const allOptions = conditions.flatMap((c) => c.paymentCondition || []).filter((o) => o?.downPayment != null && o?.downPayment !== "");
    const flatAttrs = {
        room: flatData?.room,
        totalArea,
        section: flatData?.section,
        entrance: flatData?.entrance,
        floor: flatData?.floor,
        floorGroup: flatData?.floorGroup,
        apartmentNumber: flatData?.apartmentNumber,
    };
    const matchedOptions = getMatchingOptions(allOptions as Parameters<typeof getMatchingOptions>[0], flatAttrs);
    const sourceOptions = matchedOptions;
    const options = Array.from(
        new Map(
            sourceOptions
                .filter((o) => parseDownPaymentPercent(o?.downPayment) > 0)
                .map((o) => [`${parseDownPaymentPercent(o?.downPayment)}`, o])
        ).values()
    );
    const selectedOption = options[Math.min(selectedPvIndex, Math.max(0, options.length - 1))] ?? options[0];
    const downPercent = selectedOption ? parseDownPaymentPercent(selectedOption.downPayment) || 30 : 30;
    const raiseRaw = parseRaise(selectedOption?.raise);
    const raiseAmount = raiseRaw >= 1 && raiseRaw <= 100
        ? Math.round((basePrice * raiseRaw) / 100)
        : Math.round(raiseRaw * totalArea);
    const raisePerSquareAmount = (() => {
        if (raiseRaw >= 1 && raiseRaw <= 100) {
            return totalArea > 0 ? Math.round(((basePrice * raiseRaw) / 100) / totalArea) : 0;
        }
        if (raiseRaw >= 101) {
            return Math.round(raiseRaw);
        }
        return 0;
    })();
    const totalPriceBeforeDiscounts = Math.max(0, basePrice + Math.max(0, raiseAmount));
    const promocodeDiscount = promocodeResult?.valid
        ? resolvePromocodeDiscountValue(promocodeResult?.value, totalPriceBeforeDiscounts, totalArea)
        : 0;
    const totalPrice = Math.max(0, totalPriceBeforeDiscounts - promocodeDiscount);
    const downAmount = Math.round(totalPrice * (downPercent / 100));
    const loanAmount = Math.max(0, totalPrice - downAmount);
    const totalSumM2 = totalArea > 0 ? totalPrice / totalArea : 0;
    const totalSumM2Display = formatPriceDisplay(Math.round(totalSumM2)) + "/м²";
    const validToDate = conditions[0]?.validTo ? new Date(String(conditions[0]?.validTo).replace(" ", "T")) : null;
    const validToFormatted = formatValidToDate(conditions[0]?.validTo);
    const now = today(getLocalTimeZone());
    const endDate = validToDate && !Number.isNaN(validToDate.getTime())
        ? new CalendarDate(validToDate.getFullYear(), validToDate.getMonth() + 1, validToDate.getDate())
        : new CalendarDate(now.year + 1, now.month, now.day);

    const sortedPaymentDates = useMemo(
        () => [...selectedPaymentDates].filter((d) => d.compare(todayCalendarDate) >= 0 && d.compare(endDate) <= 0).sort((a, b) => a.compare(b)),
        [selectedPaymentDates, todayCalendarDate, endDate]
    );
    const n = sortedPaymentDates.length;
    const firstAmounts = n <= 1 ? [] : sortedPaymentDates.slice(0, -1).map((d) => parseAmount(amountByDateKey[calendarDateToRu(d)] ?? "0"));
    const sumFirst = firstAmounts.reduce((a, b) => a + b, 0);
    const remainingRaw = downAmount - sumFirst;
    const amountsForRows = n === 0 ? [downAmount] : [...firstAmounts, Math.max(0, remainingRaw)];

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
        const paymentSchedule = sortedPaymentDates.length === 0
            ? [{ index: 1, date: calendarDateToRu(todayCalendarDate), sum: formatPriceDisplay(downAmount) }]
            : sortedPaymentDates.map((d, i) => ({
                index: i + 1,
                date: calendarDateToRu(d),
                sum: formatPriceDisplay(amountsForRows[i] ?? 0),
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
        fetch("/api/promocodes/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code,
                projectDocumentId: flatData.projectDocumentId,
                payment: "Hypothec",
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
    }, [promocodeInput, flatData?.projectDocumentId, t]);

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
                            <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.room || ""} {t("rooms")}</h1>
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
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatComplexDueDate(flatData?.complexDueDate) || ""}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("section")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.section || ""}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("entrance")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.entrance || ""}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("floor")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.floor || ""}</span>
                        </div>
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
            <div className="flex w-full p-[32px] flex-col items-start gap-[16px] rounded-[32px] bg-[#F4F6FB]">
                <div className="flex items-start self-stretch">
                    <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("deferred_payment_conditions")}</h1>
                </div>
                <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">
                    {t("hypothec_until")} {validToFormatted}
                </p>
                {options.length > 0 && (
                    <div className="flex flex-col gap-2 self-stretch">
                        <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">
                            {t("select_initial_payment_amount")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {options.map((opt, i) => {
                                const pctLabel = `${parseDownPaymentPercent(opt.downPayment)}%`;
                                const isSelected = selectedPvIndex === i;
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedPvIndex(i)}
                                        className={`flex px-4 py-2 rounded-[32px] text-[16px] leading-6 font-medium transition-colors ${isSelected ? "bg-[#1A3C7E] text-white" : "bg-[#FFF] text-[#2655AF] border border-[#1A3C7E]/30"}`}
                                    >
                                        {pctLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("apartment_price")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(totalPrice)}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
                    </div>
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
                            const isLast = dateKey === (sortedPaymentDates.length > 0 ? calendarDateToRu(sortedPaymentDates[sortedPaymentDates.length - 1]) : "");
                            return (
                                <div
                                    key={dateKey}
                                    className="flex justify-between flex-wrap items-center gap-2"
                                >
                                    <span className="text-[#1A3C7E] text-[14px] font-medium min-w-[90px]">
                                        {dateKey}
                                    </span>
                                    {isLast ? (
                                        <span className={`text-[14px] ${remainingRaw < 0 ? "text-red-600" : "text-[#000] opacity-80"}`}>
                                            {t("remaining")}: {formatMoney(remainingRaw)}
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2 justify-end">
                                            <Input
                                                size="sm"
                                                type="text"
                                                inputMode="numeric"
                                                value={amountByDateKey[dateKey] ?? ""}
                                                onValueChange={(v) => setAmountByDateKey((prev) => ({ ...prev, [dateKey]: formatAmountInput(v ?? "") }))}
                                                placeholder="0"
                                                classNames={{
                                                    base: "max-w-[180px] bg-[#FFF] rounded-[12px]",
                                                    input: "text-[14px] text-right",
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
                                    )}
                                </div>
                            );
                        })}
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
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{downPercent}% {t("initial_payment")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(downAmount)}</span>
                    </div>
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
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
            >
                <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{isSubmitting ? t("saving") : t("next")}</span>
            </Button>
        </div>
    );
}