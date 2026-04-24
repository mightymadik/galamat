"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button, Input, Popover, PopoverTrigger, PopoverContent, } from "@heroui/react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import type { PaymentConditionForFlat } from "@/types/flat";
import type { AgreementPayload, AgreementPaymentRow } from "@/types/agreement";
import {
    PROMO_LENGTH,
    formatPromoInput,
    formatPriceDisplay,
    formatMoney,
    parsePrice,
    formatComplexDueDate,
    monthsBetween,
    isPaymentConditionValidToday,
    isPaymentMethod,
    isActivePaymentStatus,
    parseRaise,
    getMatchingOptions,
    resolvePromocodeDiscountValue,
    resolveDownPaymentAmount,
    formatRaisePerM2Label,
    getPaymentValueUnit,
    resolveOptionTotalPrice,
} from "@/lib/paymentFormUtils";
import type { DateValue } from "@react-types/calendar";
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date";
import { Calendar } from "@heroui/react";
import { useTranslations } from "next-intl";
import { mapSendCodeErrorMessage } from "@/lib/authErrorI18n";
import type { RealEstateType } from "@/types/flat";

interface InstallmentProps {
    flatData: {
        id?: string | number;
        images?: string[];
        title?: string;
        room?: string;
        area?: string;
        price?: string;
        /** Base price string (before full-payment discount). Installment never uses discounted price. */
        originalPrice?: string;
        deadline?: string;
        section?: string;
        entrance?: string;
        floor?: string;
        apartmentNumber?: number;
        complexDueDate?: string;
        house?: number;
        paymentConditions?: PaymentConditionForFlat[];
        /** Полная цена без скидки за 100% (для рассрочки скидка за 100% не применяется) */
        fullPriceBeforeDiscount?: number;
        /** Площадь м² (надбавка за м² учитывается в стоимости) */
        totalArea?: number;
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

export default function Installment({ flatData, realEstateType = "property", activeButton, onNext, isSubmitting = false }: InstallmentProps) {
    const t = useTranslations();
    const isResidential = realEstateType === "property";
    const unitLabel = realEstateType === "commerce" ? "Коммерция" : realEstateType === "parking" ? "Паркинг" : realEstateType === "pantry" ? "Кладовка" : "Квартира";
    const user = useSelector((state: RootState) => state.auth.user);
    const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "rop";
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
    const [promocodeApplying, setPromocodeApplying] = useState(false);
    const lastValidatedCodeRef = useRef<string>("");
    const [promocodeResult, setPromocodeResult] = useState<{
        valid: boolean;
        value?: number;
        code?: string;
        error?: string;
    } | null>(null);
    const defaultCalendarDateRef = useRef(today(getLocalTimeZone()));
    const [paymentDayDate, setPaymentDayDate] = useState<DateValue | null>(() => defaultCalendarDateRef.current);

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
                setBonusVerifyError(mapSendCodeErrorMessage(data?.message, t));
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
        setPromocodeApplying(true);
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
                payment: "Installment",
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
            })
            .finally(() => setPromocodeApplying(false));
    }, [promocodeInput, flatData?.projectDocumentId, flatData?.documentId, flatData?.apartmentNumber, flatData?.house, flatData?.section, flatData?.entrance, flatData?.floor, flatData?.room, realEstateType]);

    // Installment never uses full-payment discounted price: use base price only.
    const basePrice =
        flatData?.fullPriceBeforeDiscount != null && flatData.fullPriceBeforeDiscount > 0
            ? flatData.fullPriceBeforeDiscount
            : parsePrice(flatData?.originalPrice) ?? parsePrice(flatData?.price);

    const installmentConditions = (flatData?.paymentConditions || []).filter((c) => isPaymentMethod(c as any, "installment") && isActivePaymentStatus(c as any) && isPaymentConditionValidToday(c));
    const allOptions = installmentConditions.flatMap((c) => c.paymentCondition || []).filter((o) => o?.downPayment != null && o?.downPayment !== "");
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
    const options = flatAttrs && allOptions.length > 0
        ? getMatchingOptions(allOptions as Parameters<typeof getMatchingOptions>[0], flatAttrs)
        : allOptions;

    const validToStr = installmentConditions[0]?.validTo ?? undefined;
    const validToDate = validToStr ? new Date(validToStr.replace(" ", "T")) : null;
    const now = new Date();
    const monthsCount = validToDate && validToDate > now ? monthsBetween(now, validToDate) : 1;

    const [selectedPvIndex, setSelectedPvIndex] = useState(0);
    const selectedOption = options[Math.min(selectedPvIndex, options.length - 1)] ?? options[0];
    const defaultDownPercent = 30;
    const totalArea = flatData?.totalArea ?? 0;
    const adjustmentArea = realEstateType === "parking" ? 0 : totalArea;
    const raiseRaw = parseRaise(selectedOption?.raise);
    const raisePerM2 = raiseRaw >= 101 && raiseRaw <= 50_000 ? raiseRaw : 0;
    const totalPriceBeforeDiscounts = resolveOptionTotalPrice(basePrice, adjustmentArea, selectedOption);
    const promocodeDiscount = promocodeResult?.valid
        ? resolvePromocodeDiscountValue(promocodeResult?.value, totalPriceBeforeDiscounts, adjustmentArea)
        : 0;
    const totalPrice = Math.max(0, totalPriceBeforeDiscounts - promocodeDiscount);
    const downAmount = selectedOption
        ? resolveDownPaymentAmount(selectedOption.downPayment, totalPrice)
        : (totalPrice > 0 ? Math.round((totalPrice * defaultDownPercent) / 100) : 0);
    const downPercent = totalPrice > 0 ? Math.round((downAmount / totalPrice) * 100) : defaultDownPercent;
    const downLabel = `${downPercent}%`;
    const remainingPrice = totalPrice - downAmount;
    const monthlyPayment = monthsCount > 0 ? Math.round(remainingPrice / monthsCount) : 0;

    const formattedFullPrice = formatMoney(totalPrice);
    const formattedDown = formatMoney(downAmount);
    const formattedRemaining = formatMoney(remainingPrice);
    const formattedMonthly = formatMoney(monthlyPayment);
    const formattedValidTo = validToDate && !Number.isNaN(validToDate.getTime())
        ? validToDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null;

    const dueDateStr = formattedValidTo || new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const totalSumM2 = totalArea > 0 ? totalPrice / totalArea : 0;
    const totalSumM2Display = formatPriceDisplay(Math.round(totalSumM2)) + "/м²";
    const paymentDayOfMonth = paymentDayDate?.day ?? defaultCalendarDateRef.current.day;
    const formatScheduleDate = (d: Date) =>
        d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    const calendarValue = paymentDayDate ?? defaultCalendarDateRef.current;
    const paymentProgramEndDate = (() => {
        const endMonth = new Date(now.getFullYear(), now.getMonth() + monthsCount + 1, 0);
        return new CalendarDate(endMonth.getFullYear(), endMonth.getMonth() + 1, endMonth.getDate());
    })();
    const onPaymentDayChange = useCallback((v: DateValue | null) => {
        if (!v) return;

        setPaymentDayDate((prev) => {
            const p = prev ?? defaultCalendarDateRef.current;
            if (p.day === v.day && p.month === v.month && p.year === v.year) return prev; // no rerender
            return v;
        });
    }, []);

    const handleNext = () => {
        const schedule: AgreementPaymentRow[] = [];
        const now = new Date();
        schedule.push({ index: 1, date: formatScheduleDate(now), sum: formattedDown });

        // Важно: из-за округления по месяцам сумма траншей может не совпасть с остатком на пару ₸.
        // Делаем первые (monthsCount - 1) равными, а всю разницу добавляем/убираем в последний платёж.
        const remainderTotal = Math.max(0, remainingPrice);
        const months = Math.max(1, monthsCount);
        const baseMonthly = Math.floor(remainderTotal / months);
        const lastMonthly = remainderTotal - baseMonthly * (months - 1);

        for (let i = 0; i < months; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
            const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
            const day = Math.min(paymentDayOfMonth, lastDay);
            const paymentDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
            const tranche = i === months - 1 ? lastMonthly : baseMonthly;
            schedule.push({
                index: schedule.length + 1,
                date: formatScheduleDate(paymentDate),
                sum: formatMoney(tranche),
            });
        }
        const payload: AgreementPayload = {
            paymentMethod: "installment",
            totalSum: totalPrice,
            totalSumM2: Math.round(totalSumM2),
            paymentSchedule: schedule,
            agreementProjectDueDate: dueDateStr,
            usedPromocodeCode: promocodeResult?.valid ? promocodeResult.code : undefined,
            propertyDocumentId: flatData?.documentId,
            installmentDownPaymentRaw: selectedOption?.downPayment ?? undefined,
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
                                {isResidential ? `${flatData?.room || ""} ${t("rooms_count")}` : unitLabel}
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
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                                {formatComplexDueDate(flatData?.complexDueDate, { quarterLabel: t("quarter") }) || ""}
                            </span>
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
                    <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("installment_conditions")}</h1>
                </div>
                {formattedValidTo && (
                    <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">
                        {t("installment_until")} {formattedValidTo}
                    </p>
                )}
                {options.length > 0 && (
                    <div className="flex flex-col gap-2 self-stretch">
                        <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-80">{t("select_initial_payment_amount")}</p>
                        <div className="flex flex-wrap gap-2">
                            {options.map((opt, i) => {
                                const isSelected = selectedPvIndex === i;
                                const raiseRaw = parseRaise(opt.raise);
                                const priceBeforeDiscounts = resolveOptionTotalPrice(basePrice, adjustmentArea, opt);
                                const promoDisc = promocodeResult?.valid
                                    ? resolvePromocodeDiscountValue(promocodeResult?.value, priceBeforeDiscounts, adjustmentArea)
                                    : 0;
                                const fullPriceForOpt = Math.max(0, priceBeforeDiscounts - promoDisc);
                                const downAmount = resolveDownPaymentAmount(opt.downPayment, fullPriceForOpt);
                                const pct = fullPriceForOpt > 0 ? Math.round((downAmount / fullPriceForOpt) * 100) : 0;
                                const pctLabel = `${Math.max(0, pct)}%`;
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
                    <div className="flex px-[0] py-[8px] justify-between items-center self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("payment_day")}</span>
                        <Popover placement="bottom-end">
                            <PopoverTrigger>
                                <Button className="flex h-[24px] pl-[8px] pr-[10px] py-[0] justify-center items-center gap-[4px] rounded-[32px] bg-[#4F6FBF]">
                                    <span className="text-[#FFF] text-[14px] not-italic font-medium leading-[14px]">
                                        {paymentDayDate ? `${paymentDayDate.day} ${t("day_number")}` : `${t("select_payment_day")}`}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="5" viewBox="0 0 8 5" fill="none">
                                        <path d="M7.07288 0.174964C7.285 -0.0582623 7.6289 -0.0583806 7.84096 0.174964C8.05298 0.408436 8.05305 0.787476 7.84096 1.0209L4.38405 4.82499C4.17196 5.05835 3.82808 5.05832 3.61597 4.82499L0.159062 1.0209C-0.0530408 0.787461 -0.0530006 0.408433 0.159062 0.174964C0.371121 -0.0583805 0.71502 -0.0582623 0.927146 0.174964L4.00001 3.55696L7.07288 0.174964Z" fill="white" />
                                    </svg>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Calendar
                                    aria-label={t("payment_day_description")}
                                    value={calendarValue}
                                    onChange={onPaymentDayChange}
                                    maxValue={paymentProgramEndDate}
                                    classNames={{
                                        header: "disabled",
                                        prevButton: "opacity-0 pointer-events-none",
                                        nextButton: "opacity-0 pointer-events-none",
                                        base: "bg-transparent",
                                        gridBody: "bg-[#F4F6FB]",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    {realEstateType !== "parking" && (
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
                    </div>
                    )}
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("raise_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {formatRaisePerM2Label(raiseRaw, basePrice, adjustmentArea, getPaymentValueUnit(selectedOption))}
                        </span>
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
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("remainder_of_payment")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formattedRemaining}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("monthly_payment_until")} {formattedValidTo ? ` ${formattedValidTo}` : ""}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formattedMonthly}</span>
                    </div>
                </div>
            </div>
            <Button
                onPress={handleNext}
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]">
                <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{isSubmitting ? "Сохранение…" : "Далее"}</span>
            </Button>
        </div>
    );
}
