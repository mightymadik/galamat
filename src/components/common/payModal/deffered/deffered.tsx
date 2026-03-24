"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Calendar } from "@heroui/react";
import { useSelector } from "react-redux";
import type { DateValue } from "@react-types/calendar";
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date";
import { RootState } from "@/store";
import type { PaymentConditionForFlat } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";
import {
    PROMO_LENGTH,
    formatPromoInput,
    parseBonusAmount,
    formatPriceDisplay,
    formatMoney,
    parsePrice,
    parseDownPaymentPercent,
    formatComplexDueDate,
    isPaymentConditionValidToday,
    isPaymentMethod,
    isActivePaymentStatus,
    parseRaise,
    getMatchingOptions,
    resolvePromocodeDiscountValue,
} from "@/lib/paymentFormUtils";
import { withMask } from "use-mask-input";
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
    if (Number.isNaN(n)) return "";
    return n.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

interface DefferedProps {
    flatData: {
        id?: string | number;
        images?: string[];
        title?: string;
        room?: string;
        area?: string;
        price?: string;
        /** Base price string (before full-payment discount). Deferred never uses discounted price. */
        originalPrice?: string;
        deadline?: string;
        section?: string;
        entrance?: string;
        floor?: string;
        paymentConditions?: PaymentConditionForFlat[];
        /** Полная цена без скидки за 100% (для отложенного платежа скидка за 100% не применяется) */
        fullPriceBeforeDiscount?: number;
        /** Площадь м² (надбавка за м² учитывается в стоимости) */
        totalArea?: number;
        complexDueDate?: string;
        house?: number;
        apartmentNumber?: number;
        projectDocumentId?: string;
        documentId?: string;
        sunshine?: string;
        planView?: string;
        floorGroup?: string;
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

export default function Deffered({ flatData, realEstateType = "property", activeButton, onNext, isSubmitting = false }: DefferedProps) {
    const t = useTranslations();
    const isResidential = realEstateType === "property";
    const unitLabel = realEstateType === "commerce" ? "Коммерция" : realEstateType === "parking" ? "Паркинг" : realEstateType === "pantry" ? "Кладовка" : "Квартира";
    const user = useSelector((state: RootState) => state.auth.user);
    const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";
    const [galaBonus, setGalaBonus] = useState<string>("0 ₸");
    const [galaBonusAmount, setGalaBonusAmount] = useState<number>(0);
    const [galaBonusWhen, setGalaBonusWhen] = useState<string | null>(null);
    const [galaBonusChecked, setGalaBonusChecked] = useState(false);
    const [galaBonusChecking, setGalaBonusChecking] = useState(false);
    const [managerBonusPhone, setManagerBonusPhone] = useState<string>("");
    const [managerBonusPhoneVerified, setManagerBonusPhoneVerified] = useState<boolean>(false);
    const [bonusPhoneStep, setBonusPhoneStep] = useState<"phone" | "code" | "verified">("phone");
    const [bonusVerificationCode, setBonusVerificationCode] = useState<string[]>(["", "", "", ""]);
    const [isSendingBonusCode, setIsSendingBonusCode] = useState(false);
    const [isVerifyingBonusCode, setIsVerifyingBonusCode] = useState(false);
    const [bonusVerifyError, setBonusVerifyError] = useState<string | null>(null);
    const [bonusAttemptsLeft, setBonusAttemptsLeft] = useState<number | null>(null);
    const [bonusTimeLeft, setBonusTimeLeft] = useState(0);
    const bonusCodeInputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const [promocodeInput, setPromocodeInput] = useState<string>("");
    const lastValidatedCodeRef = useRef<string>("");
    const [promocodeResult, setPromocodeResult] = useState<{
        valid: boolean;
        value?: number;
        code?: string;
        error?: string;
    } | null>(null);
    const [selectedPaymentDates, setSelectedPaymentDates] = useState<CalendarDate[]>(() => [
        today(getLocalTimeZone()),
    ]);
    const [amountByDateKey, setAmountByDateKey] = useState<Record<string, string>>({});

    const effectiveBonusPhone = isManagerOrAdmin
        ? (managerBonusPhoneVerified && managerBonusPhone.trim() ? managerBonusPhone.trim() : null)
        : user?.phone ?? null;

    useEffect(() => {
        if (isManagerOrAdmin && bonusPhoneStep === "phone") setManagerBonusPhoneVerified(false);
    }, [managerBonusPhone, isManagerOrAdmin, bonusPhoneStep]);

    useEffect(() => {
        if (bonusTimeLeft <= 0) return;
        const timer = setInterval(() => setBonusTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [bonusTimeLeft]);

    const isManagerBonusPhoneValid = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(managerBonusPhone.trim());
    const sendBonusCode = async () => {
        if (!isManagerBonusPhoneValid || isSendingBonusCode) return;
        setBonusVerifyError(null);
        setIsSendingBonusCode(true);
        try {
            const res = await fetch("/api/auth/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: managerBonusPhone }),
            });
            const data = await res.json();
            if (data?.status === "ok") {
                setBonusPhoneStep("code");
                setBonusVerificationCode(["", "", "", ""]);
                setBonusTimeLeft(data?.meta?.expiresInSec ?? 180);
                bonusCodeInputsRef.current[0]?.focus();
            } else {
                setBonusVerifyError(data?.message === "invalid_phone" ? t("wrong_phone") : data?.message || t("error_sending_code"));
            }
        } catch {
            setBonusVerifyError(t("error_sending_code"));
        } finally {
            setIsSendingBonusCode(false);
        }
    };

    const verifyBonusCode = async () => {
        const code = bonusVerificationCode.join("");
        if (!/^\d{4}$/.test(code) || isVerifyingBonusCode) return;
        setBonusVerifyError(null);
        setIsVerifyingBonusCode(true);
        try {
            const res = await fetch("/api/galaBonus/verify-phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: managerBonusPhone, code }),
            });
            const data = await res.json();
            if (data?.status === "ok") {
                setManagerBonusPhoneVerified(true);
                setBonusPhoneStep("verified");
                setBonusVerifyError(null);
            } else {
                setBonusVerifyError(
                    data?.message === "invalid_code"
                        ? `${t("wrong_code")}${typeof data?.meta?.attemptsLeft === "number" ? `. ${t("attempts_left")}: ${data.meta.attemptsLeft}` : ""}`
                        : data?.message === "code_expired_or_not_found"
                            ? `${t("code_expired")}. ${t("request_new_code")}`
                            : data?.message === "too_many_attempts"
                                ? `${t("too_many_attempts")}. ${t("try_later")}`
                                : `${t("code_verification_error")}`
                );
                setBonusAttemptsLeft(data?.meta?.attemptsLeft ?? null);
                setBonusVerificationCode(["", "", "", ""]);
                bonusCodeInputsRef.current[0]?.focus();
            }
        } catch {
            setBonusVerifyError(t("code_verification_error"));
        } finally {
            setIsVerifyingBonusCode(false);
        }
    };

    const handleBonusCodeChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return;
        const next = [...bonusVerificationCode];
        next[index] = value;
        setBonusVerificationCode(next);
        setBonusVerifyError(null);
        if (value && index < 3) bonusCodeInputsRef.current[index + 1]?.focus();
        if (next.join("").length === 4) bonusCodeInputsRef.current[3]?.blur();
    };

    const handleBonusCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !bonusVerificationCode[index] && index > 0) {
            bonusCodeInputsRef.current[index - 1]?.focus();
        }
    };

    const formatBonusTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
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
                payment: "Deferred",
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
    }, [promocodeInput, flatData?.projectDocumentId, flatData?.documentId, flatData?.apartmentNumber, flatData?.house, flatData?.section, flatData?.entrance, flatData?.floor, flatData?.room, realEstateType]);

    // Deferred never uses full-payment discounted price: use base price only.
    const basePrice =
        flatData?.fullPriceBeforeDiscount != null && flatData.fullPriceBeforeDiscount > 0
            ? flatData.fullPriceBeforeDiscount
            : parsePrice(flatData?.originalPrice) ?? parsePrice(flatData?.price);

    const defferedConditions = (flatData?.paymentConditions || []).filter((c) => isPaymentMethod(c as any, "deffered") && isActivePaymentStatus(c as any) && isPaymentConditionValidToday(c));
    const allOptions = defferedConditions
        .flatMap((c) => c.paymentCondition || [])
        .filter((o) => o?.downPayment != null && o?.downPayment !== "");
    const flatAttrs = flatData
        ? {
            room: flatData.room,
            totalArea: flatData.totalArea,
            house: flatData.house,
            section: flatData.section,
            entrance: flatData.entrance,
            floor: flatData.floor,
            floorGroup: flatData.floorGroup,
            apartmentNumber: flatData.apartmentNumber,
        }
        : undefined;
    const matchedOptions = flatAttrs
        ? getMatchingOptions(allOptions as Parameters<typeof getMatchingOptions>[0], flatAttrs)
        : allOptions;
    const options = Array.from(
        new Map(
            matchedOptions.map((o) => [`${parseDownPaymentPercent(o?.downPayment)}|${parseRaise(o?.raise)}`, o])
        ).values()
    );

    const validToStr = defferedConditions[0]?.validTo ?? undefined;
    const validToDate = validToStr ? new Date(validToStr.replace(" ", "T")) : null;
    const formattedValidTo = validToDate && !Number.isNaN(validToDate.getTime())
        ? validToDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null;

    const [selectedPvIndex, setSelectedPvIndex] = useState(0);
    const selectedOption = options[selectedPvIndex] ?? options[0];
    const defaultDownPercent = 30;
    const downPercent = selectedOption ? parseDownPaymentPercent(selectedOption.downPayment) || defaultDownPercent : defaultDownPercent;
    const raisePerM2 = parseRaise(selectedOption?.raise);
    const totalArea = flatData?.totalArea ?? 0;
    const adjustmentArea = realEstateType === "parking" ? 0 : totalArea;
    const totalPriceBeforeDiscounts = basePrice + raisePerM2 * adjustmentArea;
    const promocodeDiscount = promocodeResult?.valid
        ? resolvePromocodeDiscountValue(promocodeResult?.value, totalPriceBeforeDiscounts, adjustmentArea)
        : 0;
    const totalPrice = Math.max(0, totalPriceBeforeDiscounts - promocodeDiscount);
    const downLabel = `${downPercent}%`;
    const downAmount = Math.round(totalPrice * (downPercent / 100));
    const remainingPrice = totalPrice - downAmount;

    const formattedFullPrice = formatMoney(totalPrice);
    const formattedDown = formatMoney(downAmount);
    const formattedRemaining = formatMoney(remainingPrice);

    const dueDateStr = formattedValidTo || new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const totalSumM2 = totalArea > 0 ? totalPrice / totalArea : 0;
    const totalSumM2Display = formatPriceDisplay(Math.round(totalSumM2)) + "/м²";
    const formatScheduleDate = (d: Date) =>
        d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const todayStr = formatScheduleDate(new Date());

    const now = today(getLocalTimeZone());
    const todayCalendarDate = today(getLocalTimeZone());

    const programEndDate = (() => {
        if (validToDate && !Number.isNaN(validToDate.getTime())) {
            return new Date(validToDate.getFullYear(), validToDate.getMonth(), validToDate.getDate());
        }
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return new Date(d.getFullYear(), d.getMonth(), Math.min(now.day, lastDay));
    })();
    const programEndCalendarDate = new CalendarDate(
        programEndDate.getFullYear(),
        programEndDate.getMonth() + 1,
        programEndDate.getDate()
    );

    const onPaymentDayToggle = (date: DateValue) => {
        const cd = "day" in date ? date : (date as CalendarDate);
        if ((cd as CalendarDate).compare(todayCalendarDate) < 0) return;
        if ((cd as CalendarDate).compare(programEndCalendarDate) > 0) return;
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

    const setAmountForDate = (dateKey: string, value: string) => {
        setAmountByDateKey((prev) => ({ ...prev, [dateKey]: value }));
    };

    const sortedPaymentDates = [...selectedPaymentDates]
        .filter((d) => d.compare(todayCalendarDate) >= 0)
        .filter((d) => d.compare(programEndCalendarDate) <= 0)
        .sort((a, b) => a.compare(b));
    const n = sortedPaymentDates.length;
    const deferredTotal = downAmount;
    const firstAmounts = n <= 1 ? [] : sortedPaymentDates.slice(0, -1).map((d) => parsePrice(amountByDateKey[calendarDateToRu(d)] ?? "0"));
    const sumFirst = firstAmounts.reduce((a, b) => a + b, 0);
    const remainingRaw = deferredTotal - sumFirst;
    const amountsForRows = ((): number[] => {
        if (n === 0) return [deferredTotal];
        const lastAmount = Math.max(0, remainingRaw);
        return [...firstAmounts, lastAmount];
    })();
    const deferredScheduleRows: AgreementPayload["paymentSchedule"] =
        sortedPaymentDates.length === 0
            ? [{ index: 1, date: todayStr, sum: formatMoney(deferredTotal) }]
            : sortedPaymentDates.map((d, i) => ({
                index: i + 1,
                date: calendarDateToRu(d),
                sum: formatMoney(amountsForRows[i] ?? 0),
            }));

    const handleNext = () => {
        const payload: AgreementPayload = {
            paymentMethod: "deffered",
            totalSum: totalPrice,
            totalSumM2: Math.round(totalSumM2),
            paymentSchedule: [
                ...deferredScheduleRows,
                { index: deferredScheduleRows.length + 1, date: dueDateStr, sum: formatMoney(Math.max(0, remainingPrice)) },
            ],
            agreementProjectDueDate: dueDateStr,
            usedPromocodeCode: promocodeResult?.valid ? promocodeResult.code : undefined,
            propertyDocumentId: flatData?.documentId,
            paymentConditionDownPaymentRaw: selectedOption?.downPayment ?? undefined,
        };
        onNext(payload);
    };

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
                            <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[24px]">{flatData?.title || ''}</h1>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px] opacity-30">№{flatData?.apartmentNumber || ""}</span>
                        </div>
                        <div className="flex justify-between items-start self-stretch">
                            <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">
                                {isResidential ? `${flatData?.room || ""} ${t("rooms")}` : unitLabel}
                            </h1>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.area || ''}</span>
                        </div>
                        <div className="flex items-end gap-[5px] self-stretch">
                            <h1 className="text-[#2655AF] text-[20px] not-italic font-medium leading-[16px]">{formattedFullPrice}</h1>
                        </div>
                        <div className="flex items-end gap-[5px] self-stretch">
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
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.title || ''}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("house")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.house || ''}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("due_date")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatComplexDueDate(flatData?.complexDueDate) || ""}</span>
                        </div>
                        {Boolean(flatData?.section) && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("section")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.section || ''}</span>
                        </div>
                        )}
                        {Boolean(flatData?.entrance) && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("entrance")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.entrance || ''}</span>
                        </div>
                        )}
                        {isResidential && Boolean(flatData?.floor) && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("floor")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.floor || ''}</span>
                        </div>
                        )}
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{isResidential ? t("apartment") : "Номер"}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">№{flatData?.apartmentNumber || ''}</span>
                        </div>
                    </div>
                </div>
            </div>
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
            <div className="flex w-full p-[32px] flex-col items-start gap-[16px] rounded-[32px] bg-[#F4F6FB]">
                <div className="flex items-start self-stretch">
                    <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("deferred_payment_conditions")}</h1>
                </div>
                <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">
                    {t("deffered_until")} {formattedValidTo}
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
                    {realEstateType !== "parking" && (
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
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
                                    maxValue={programEndCalendarDate}
                                    classNames={{
                                        header: "disabled",
                                        base: "bg-transparent",
                                        gridBody: "bg-[#F4F6FB]",
                                    }}
                                />
                                <p className="text-[#122C5E] text-[12px] opacity-70 px-2 pb-2">
                                    {t("deffered_until")} {formatScheduleDate(programEndDate)}
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
                                                onValueChange={(v) => setAmountForDate(dateKey, formatAmountInput(v ?? ""))}
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
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPriceDisplay(raisePerM2)}</span>
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
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{downLabel} {t("initial_payment")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formattedDown}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("make_deffered_payment_until")} {formattedValidTo ? ` ${formattedValidTo}` : ""}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatMoney(Math.max(0, remainingPrice))}</span>
                    </div>
                </div>
            </div>
            <Button
                onPress={handleNext}
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]">
                <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{isSubmitting ? t("saving") : t("next")}</span>
            </Button>
        </div>
    );
}
