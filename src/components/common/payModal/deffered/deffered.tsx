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
} from "@/lib/paymentFormUtils";
import { withMask } from "use-mask-input";
import { useTranslations } from "next-intl";

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
    activeButton: string | null;
    onNext: (payload?: AgreementPayload) => void;
    isSubmitting?: boolean;
}

export default function Deffered({ flatData, activeButton, onNext, isSubmitting = false }: DefferedProps) {
    const t = useTranslations();
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
    const [paymentDayDate, setPaymentDayDate] = useState<DateValue | null>(null);

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
        if (!effectiveBonusPhone) {
            setGalaBonus("0 ₸");
            setGalaBonusAmount(0);
            setGalaBonusWhen(null);
            setGalaBonusChecked(false);
            setGalaBonusChecking(false);
            return;
        }
        setGalaBonusChecking(true);
        setGalaBonusChecked(false);
        fetch("/api/galaBonus/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: effectiveBonusPhone }),
        })
            .then((res) => res.json())
            .then((data: { bonus?: string; status?: string; when?: string | null } | null) => {
                if (data?.status === "notFound" || data?.status === "error") {
                    setGalaBonus("0 ₸");
                    setGalaBonusAmount(0);
                    setGalaBonusWhen(null);
                    return;
                }
                const amount = parseBonusAmount(data?.bonus);
                setGalaBonus(formatPriceDisplay(amount));
                setGalaBonusAmount(amount);
                setGalaBonusWhen(data?.when ?? null);
            })
            .catch(() => {
                setGalaBonus("0 ₸");
                setGalaBonusAmount(0);
                setGalaBonusWhen(null);
            })
            .finally(() => {
                setGalaBonusChecking(false);
                setGalaBonusChecked(true);
            });
    }, [effectiveBonusPhone]);

    const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days (same as wheel lock)
    const galaWhenMs = galaBonusWhen ? new Date(String(galaBonusWhen).replace(" ", "T")).getTime() : NaN;
    const galaLocked = Number.isFinite(galaWhenMs) ? (Date.now() - galaWhenMs < TWO_MONTHS_MS) : false;
    const galaNextSpinAt = galaLocked ? new Date(galaWhenMs + TWO_MONTHS_MS) : null;
    const galaWhenText = Number.isFinite(galaWhenMs)
        ? new Date(galaWhenMs).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
        : null;
    const galaNextSpinText = galaNextSpinAt
        ? galaNextSpinAt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null;

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
                flat: flatPayload,
                payment: "Deferred",
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
    }, [promocodeInput, flatData?.projectDocumentId, flatData?.apartmentNumber, flatData?.house, flatData?.section, flatData?.entrance, flatData?.floor, flatData?.room]);

    // Deferred never uses full-payment discounted price: use base price only.
    const basePrice =
        flatData?.fullPriceBeforeDiscount != null && flatData.fullPriceBeforeDiscount > 0
            ? flatData.fullPriceBeforeDiscount
            : parsePrice(flatData?.originalPrice) ?? parsePrice(flatData?.price);

    const defferedConditions = (flatData?.paymentConditions || []).filter((c) => isPaymentMethod(c as any, "deffered") && isActivePaymentStatus(c as any) && isPaymentConditionValidToday(c));
    const options = defferedConditions.flatMap((c) => c.paymentCondition || []).filter((o) => o?.downPayment != null && o?.downPayment !== "");

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
    const promocodeDiscount = promocodeResult?.valid && promocodeResult?.value != null ? Number(promocodeResult.value) : 0;
    const totalPriceBeforeDiscounts = basePrice + raisePerM2 * totalArea;
    const totalPrice = Math.max(0, totalPriceBeforeDiscounts - galaBonusAmount - promocodeDiscount);
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
    const lastDayOfCurrentMonth = new Date(now.year, now.month, 0).getDate();
    const selectedDay = paymentDayDate?.day ?? now.day;
    const rawDay = Math.min(Math.max(1, selectedDay), lastDayOfCurrentMonth);
    const calendarValue = new CalendarDate(now.year, now.month, rawDay);
    const onPaymentDayChange = useCallback((v: DateValue | null) => {
        if (!v) return;
        setPaymentDayDate(v);
    }, []);
    const usedGalaBonusAmount = galaBonusAmount > 0
        ? Math.min(galaBonusAmount, Math.max(0, totalPriceBeforeDiscounts - promocodeDiscount))
        : 0;

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

    const calendarValueClamped =
        calendarValue.compare(programEndCalendarDate) > 0 ? programEndCalendarDate : calendarValue;
    const paymentDayOfMonth = calendarValueClamped.day;

    const remainderDueDate = (() => {
        if (!validToDate || Number.isNaN(validToDate.getTime())) {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const day = Math.min(paymentDayOfMonth, lastDay);
            return new Date(d.getFullYear(), d.getMonth(), day);
        }
        const lastDay = new Date(validToDate.getFullYear(), validToDate.getMonth() + 1, 0).getDate();
        const day = Math.min(paymentDayOfMonth, lastDay);
        return new Date(validToDate.getFullYear(), validToDate.getMonth(), day);
    })();
    const remainderDueDateStr = formatScheduleDate(remainderDueDate);

    const handleNext = () => {
        const payload: AgreementPayload = {
            paymentMethod: "deffered",
            totalSum: totalPrice,
            totalSumM2: Math.round(totalSumM2),
            paymentSchedule: [
                { index: 1, date: todayStr, sum: formattedDown },
                { index: 2, date: remainderDueDateStr, sum: formattedRemaining },
            ],
            agreementProjectDueDate: dueDateStr,
            usedPromocodeCode: promocodeResult?.valid ? promocodeResult.code : undefined,
            usedGalaBonusAmount: usedGalaBonusAmount || undefined,
            propertyDocumentId: flatData?.documentId,
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
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px] opacity-30">№{flatData?.apartmentNumber || ''}</span>
                        </div>
                        <div className="flex justify-between items-start self-stretch">
                            <h1 className="text-[#000] text-[16px] not-italic font-normal leading-[24px]">{flatData?.room || ''} {t("rooms")}</h1>
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
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("section")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.section || ''}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("entrance")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.entrance || ''}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("floor")}</span>
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{flatData?.floor || ''}</span>
                        </div>
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("apartment")}</span>
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
            {isManagerOrAdmin && (
                <div className="flex flex-col gap-2 w-full">
                    <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">{t("client_phone")}</span>
                    {bonusPhoneStep === "phone" && (
                        <>
                            <Input
                                inputMode="numeric"
                                value={managerBonusPhone}
                                onValueChange={(v) => { setManagerBonusPhone(v); setBonusVerifyError(null); }}
                                variant="flat"
                                placeholder="+7 (999) 999-99-99"
                                ref={withMask("+7 (999) 999-99-99")}
                                classNames={{
                                    base: "w-full bg-[#F4F6FB] rounded-[16px] px-[16px] py-[8px]",
                                    input: "!text-[#1A3C7E] text-[16px] font-medium leading-[24px] py-2",
                                    inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                                    innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                                }}
                            />
                            <Button
                                onPress={sendBonusCode}
                                isDisabled={!isManagerBonusPhoneValid || isSendingBonusCode}
                                className="w-full rounded-[12px] bg-[#1A3C7E] text-white text-[14px] font-medium leading-[20px]"
                            >
                                {isSendingBonusCode ? t("sending") : t("get_code")}
                            </Button>
                            {bonusVerifyError && bonusPhoneStep === "phone" && (
                                <p className="text-danger-500 text-[14px] font-normal leading-[20px]">{bonusVerifyError}</p>
                            )}
                        </>
                    )}
                    {bonusPhoneStep === "code" && (
                        <>
                            <p className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-80">
                                {t("code_sent_to_whatsapp", { managerBonusPhone: managerBonusPhone })}
                            </p>
                            <div className="flex gap-2">
                                {bonusVerificationCode.map((val, i) => (
                                    <Input
                                        key={i}
                                        type="tel"
                                        inputMode="numeric"
                                        value={val}
                                        maxLength={1}
                                        onChange={(e) => handleBonusCodeChange(i, e.target.value)}
                                        onKeyDown={(e) => handleBonusCodeKeyDown(i, e)}
                                        ref={(el) => { bonusCodeInputsRef.current[i] = el; }}
                                        classNames={{
                                            input: "text-center text-[16px] font-medium text-[#1A3C7E] bg-[#F4F6FB] rounded-[12px] h-[48px]",
                                            inputWrapper: "p-0 w-full h-[48px]",
                                        }}
                                    />
                                ))}
                            </div>
                            {bonusVerifyError && (
                                <p className="text-danger-500 text-[14px] font-normal leading-[20px]">{bonusVerifyError}</p>
                            )}
                            <Button
                                onPress={verifyBonusCode}
                                isDisabled={bonusVerificationCode.join("").length !== 4 || isVerifyingBonusCode}
                                className="w-full rounded-[12px] bg-[#1A3C7E] text-white text-[14px] font-medium leading-[20px]"
                            >
                                {isVerifyingBonusCode ? t("verification_in_progress") : t("confirm_number")}
                            </Button>
                            {bonusTimeLeft > 0 ? (
                                <p className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-80">
                                    {t("resend_code_in")} {formatBonusTime(bonusTimeLeft)}
                                </p>
                            ) : (
                                <Button onPress={sendBonusCode} isDisabled={isSendingBonusCode} className="!p-0 !min-h-0 h-auto !bg-transparent text-[#1A3C7E] text-[14px] font-medium">
                                    {t("send_code_again")}
                                </Button>
                            )}
                            <Button onPress={() => { setBonusPhoneStep("phone"); setBonusVerifyError(null); }} className="!p-0 !min-h-0 h-auto !bg-transparent text-[#2655AF] text-[14px]">
                                {t("change_number")}
                            </Button>
                        </>
                    )}
                    {bonusPhoneStep === "verified" && (
                        <div className="flex items-center justify-between gap-2 rounded-[16px] bg-[#F4F6FB] px-[16px] py-[12px]">
                            <div className="flex flex-row items-start">
                                <span className="text-[#1A3C7E] text-[16px] font-medium leading-[20px]">{managerBonusPhone}</span>
                            </div>
                            <div className="flex flex-row items-center">
                                <span className="text-[#0e7c0e] text-[14px] font-normal leading-[20px]">{t("confirmed")}</span>
                                <Button onPress={() => { setBonusPhoneStep("phone"); setManagerBonusPhoneVerified(false); setManagerBonusPhone(""); }} size="sm" className="!min-h-0 h-auto !bg-transparent text-[#2655AF] text-[14px] font-medium">
                                    {t("change")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex p-[16px] items-center gap-[9px] self-stretch rounded-[16px] bg-[#F4F6FB]">
                <div className="flex justify-between items-center gap-[4.094px] flex-[1_0_0]">
                    <div className="flex flex-col justify-between items-start gap-[8px]">
                        <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">
                            Gala Bonus
                        </span>
                        <span className="text-[#1A3C7E] text-[20px] font-medium leading-[24px]">
                            {galaBonus}
                        </span>
                        {galaBonusChecking && (
                            <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">
                                {t("gala_bonus_checking")}
                            </span>
                        )}
                        {galaBonusChecked && !galaBonusChecking && (
                            <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-80">
                                {galaBonusAmount > 0 ? t("gala_bonus_can_use_in_payment") : t("gala_bonus_not_available")}
                            </span>
                        )}
                        {galaWhenText && (
                            <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">
                                {t("gala_bonus_spinned_date")} {galaWhenText}
                                {galaLocked && galaNextSpinText ? (
                                    <>
                                        {". "} {t("gala_bonus_can_spin_again")} {galaNextSpinText}
                                    </>
                                ) : (
                                    <>
                                        {". "} {t("gala_bonus_can_spin_now")}
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z" fill="#1C274C" fillOpacity="0.22" />
                        <path d="M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="#1C274C" fillOpacity="0.22" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z" fill="#1C274C" fillOpacity="0.22" />
                    </svg>
                </div>
            </div>
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
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatMoney(totalPriceBeforeDiscounts)}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("price_per_square_meter")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{totalSumM2Display}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-center self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{t("payment_day")}</span>
                        <Popover placement="bottom-end">
                            <PopoverTrigger>
                                <Button className="flex h-[24px] pl-[8px] pr-[10px] py-[0] justify-center items-center gap-[4px] rounded-[32px] bg-[#4F6FBF]">
                                    <span className="text-[#FFF] text-[14px] not-italic font-medium leading-[14px]">
                                        {`${paymentDayOfMonth} ${t("day_number")}`}
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="5" viewBox="0 0 8 5" fill="none">
                                        <path d="M7.07288 0.174964C7.285 -0.0582623 7.6289 -0.0583806 7.84096 0.174964C8.05298 0.408436 8.05305 0.787476 7.84096 1.0209L4.38405 4.82499C4.17196 5.05835 3.82808 5.05832 3.61597 4.82499L0.159062 1.0209C-0.0530408 0.787461 -0.0530006 0.408433 0.159062 0.174964C0.371121 -0.0583805 0.71502 -0.0582623 0.927146 0.174964L4.00001 3.55696L7.07288 0.174964Z" fill="white" />
                                    </svg>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0">
                                <Calendar
                                    aria-label={t("payment_day_description")}
                                    value={calendarValueClamped}
                                    onChange={onPaymentDayChange}
                                    maxValue={programEndCalendarDate}
                                    classNames={{
                                        header: "disabled",
                                        prevButton: "opacity-0 pointer-events-none",
                                        nextButton: "opacity-0 pointer-events-none",
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
                                {promocodeResult.value != null ? formatPriceDisplay(promocodeResult.value) : "0 ₸"}
                            </span>
                        </div>
                    )}
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Gala Bonus</span>
                        <span className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">{galaBonus}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{downLabel} {t("initial_payment")}</span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formattedDown}</span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("make_deffered_payment_until")} {formattedValidTo ? ` ${formattedValidTo}` : ""}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formattedRemaining}</span>
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
