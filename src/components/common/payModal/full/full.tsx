"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button, Input } from "@heroui/react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import type { AgreementPayload } from "@/types/agreement";
import {
    PROMO_LENGTH,
    formatPromoInput,
    parseBonusAmount,
    formatPriceDisplay,
    formatGalaBonusDisplay,
    parsePriceString,
    formatComplexDueDate,
    getFullPaymentDiscountFromConditions,
    resolvePromocodeDiscountValue,
} from "@/lib/paymentFormUtils";
import { withMask } from "use-mask-input";
import type { DateValue } from "@react-types/calendar";
import { getLocalTimeZone, today, type CalendarDate } from "@internationalized/date";
import { Calendar, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { useTranslations } from "next-intl";
import { mapSendCodeErrorMessage } from "@/lib/authErrorI18n";
import type { RealEstateType } from "@/types/flat";

function calendarDateToRu(date: CalendarDate): string {
    const d = String(date.day).padStart(2, "0");
    const m = String(date.month).padStart(2, "0");
    return `${d}.${m}.${date.year}`;
}

/** Форматирует ввод суммы: только цифры → "1 234 567" */
function formatAmountInput(value: string): string {
    const digits = (value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    const n = parseInt(digits, 10);
    if (Number.isNaN(n)) return "";
    return n.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

interface FullPaymentProps {
    flatData: {
        id: string | number;
        images: string[];
        title: string;
        room: string;
        area: string;
        price: string;
        priceM2: string;
        /** Original price before discount (when fullPaymentDiscount is set). */
        originalPrice?: string;
        complexDueDate: string;
        section: string;
        entrance: string;
        floor: string;
        apartmentNumber: number;
        house: number;
        /** Discount amount in ₸ (e.g. 351000). Optional. */
        fullPaymentDiscount?: number;
        /** Discount as % (e.g. 3 for -3%). Optional. */
        discountPercent?: number;
        /** Project documentId for promocode validation */
        projectDocumentId?: string;
        documentId?: string;
        sunshine?: string;
        paymentConditions?: { paymentMethod?: string; paymentStatus?: string; paymentCondition?: { raise?: number | string | null }[] }[];
        fullPriceBeforeDiscount?: number;
        planView?: string;
        floorGroup?: string;
        loggiaView?: string;
        location?: string;
        riseRow?: number;
        windowView?: string;
    } | null;
    realEstateType?: RealEstateType;
    activeButton: string | null; // '1day', '3days', '5days'
    onNext: (payload?: AgreementPayload) => void;
    isSubmitting?: boolean;
}

export default function FullPayment({ flatData, realEstateType = "property", activeButton, onNext, isSubmitting = false }: FullPaymentProps) {
    const t = useTranslations();
    const isResidential = realEstateType === "property";
    const unitLabel = realEstateType === "commerce" ? "Коммерция" : realEstateType === "parking" ? "Паркинг" : realEstateType === "pantry" ? "Кладовка" : "Квартира";
    const user = useSelector((state: RootState) => state.auth.user);
    const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "rop";
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
    const [promocodeApplying, setPromocodeApplying] = useState(false);
    const lastValidatedCodeRef = useRef<string>("");
    const [promocodeResult, setPromocodeResult] = useState<{
        valid: boolean;
        value?: number;
        code?: string;
        error?: string;
    } | null>(null);
    /** Выбранные даты платежей (транши) — в календаре можно выбрать несколько дней */
    const [selectedPaymentDates, setSelectedPaymentDates] = useState<CalendarDate[]>(() => [
        today(getLocalTimeZone()),
    ]);
    /** Суммы по датам (ключ = dd.MM.yyyy). Для последней даты сумма не хранится — считается остатком. */
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
                payment: "Full",
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

    const basePrice = (flatData as { fullPriceBeforeDiscount?: number } | null)?.fullPriceBeforeDiscount
        ?? parsePriceString(flatData?.originalPrice)
        ?? parsePriceString(flatData?.price);
    const totalArea = (flatData as { totalArea?: number } | null)?.totalArea ?? 0;
    const flatAttrs: Record<string, unknown> | undefined = flatData
        ? {
            room: (flatData as Record<string, unknown>).room,
            totalArea: (flatData as Record<string, unknown>).totalArea,
            house: (flatData as Record<string, unknown>).house,
            section: (flatData as Record<string, unknown>).section,
            entrance: (flatData as Record<string, unknown>).entrance,
            floor: (flatData as Record<string, unknown>).floor,
            floorGroup: (flatData as Record<string, unknown>).floorGroup,
            apartmentNumber: (flatData as Record<string, unknown>).apartmentNumber,
        }
        : undefined;
    const adjustmentArea = realEstateType === "parking" ? 0 : totalArea;
    const conditionDiscount = getFullPaymentDiscountFromConditions(flatData?.paymentConditions as any, basePrice ?? 0, adjustmentArea, flatAttrs);
    const basePriceM2 = formatPriceDisplay(parsePriceString(flatData?.priceM2));
    const flatPriceNumber = Math.max(0, basePrice - conditionDiscount);
    const promocodeDiscount = promocodeResult?.valid
        ? resolvePromocodeDiscountValue(promocodeResult?.value, flatPriceNumber, adjustmentArea)
        : 0;
    const totalWithBonus = Math.max(0, flatPriceNumber - galaBonusAmount - promocodeDiscount);
    const totalPriceDisplay = formatPriceDisplay(totalWithBonus);

    const totalSumM2 = totalArea > 0 ? totalWithBonus / totalArea : 0;
    const totalSumM2Display = formatPriceDisplay(Math.round(totalSumM2)) + "/м²";
    const todayStr = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
    const dueDateStr = formatComplexDueDate(flatData?.complexDueDate, { quarterLabel: t("quarter") }) || todayStr;

    const usedGalaBonusAmount = galaBonusAmount > 0
        ? Math.min(galaBonusAmount, Math.max(0, flatPriceNumber - promocodeDiscount))
        : 0;

    const sortedPaymentDates = [...selectedPaymentDates].sort((a, b) => a.compare(b));
    const n = sortedPaymentDates.length;
    const total = totalWithBonus;
    const firstAmounts = n <= 1 ? [] : sortedPaymentDates.slice(0, -1).map((d) => parsePriceString(amountByDateKey[calendarDateToRu(d)] ?? "0"));
    const sumFirst = firstAmounts.reduce((a, b) => a + b, 0);
    const remainingRaw = total - sumFirst;
    const amountsForRows = ((): number[] => {
        if (n === 0) return [total];
        const lastAmount = Math.max(0, remainingRaw);
        return [...firstAmounts, lastAmount];
    })();
    const paymentScheduleRows: AgreementPayload["paymentSchedule"] =
        sortedPaymentDates.length === 0
            ? [{ index: 1, date: todayStr, sum: totalPriceDisplay }]
            : sortedPaymentDates.map((d, i) => ({
                index: i + 1,
                date: calendarDateToRu(d),
                sum: formatPriceDisplay(amountsForRows[i] ?? 0),
            }));

    const handleNext = () => {
        const payload: AgreementPayload = {
            paymentMethod: "full",
            totalSum: totalWithBonus,
            totalSumM2: Math.round(totalSumM2),
            paymentSchedule: paymentScheduleRows,
            agreementProjectDueDate: dueDateStr,
            usedPromocodeCode: promocodeResult?.valid ? promocodeResult.code : undefined,
            usedGalaBonusAmount: usedGalaBonusAmount || undefined,
            propertyDocumentId: flatData?.documentId,
        };
        onNext(payload);
    };

    const onPaymentDayToggle = (date: DateValue) => {
        const cd = "day" in date ? date : (date as CalendarDate);
        const todayCalendarDate = today(getLocalTimeZone());
        if ((cd as CalendarDate).compare(todayCalendarDate) < 0) return;
        setSelectedPaymentDates((prev) => {
            const next = prev.filter((d) => d.compare(cd) !== 0);
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

    const calendarValue = sortedPaymentDates[0] ?? today(getLocalTimeZone());
    const lastDateKey = n > 0 ? calendarDateToRu(sortedPaymentDates[n - 1]) : null;

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
                            {conditionDiscount > 0 && (
                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px] line-through opacity-60 mr-1">
                                    {formatPriceDisplay(basePrice)}
                                </span>
                            )}
                            <h1 className="text-[#2655AF] text-[20px] not-italic font-medium leading-[16px]">{totalPriceDisplay}</h1>
                        </div>
                        {((flatData?.discountPercent != null && flatData.discountPercent > 0) || (conditionDiscount > 0 && basePrice > 0)) && (
                            <div className="flex items-end gap-[5px] self-stretch">
                                <div className="flex h-[24px] pl-[8px] pr-[10px] py-[0] justify-center items-center gap-[4px] rounded-[32px] bg-[#F04800]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M6.52089 2.59384C6.8968 2.27349 7.08476 2.11331 7.28128 2.01938C7.73581 1.80213 8.26421 1.80213 8.71874 2.01938C8.91526 2.11331 9.10321 2.27349 9.47913 2.59384C9.62875 2.72134 9.70355 2.78509 9.78345 2.83864C9.96659 2.96139 10.1723 3.04659 10.3886 3.08929C10.4829 3.10792 10.5809 3.11574 10.7768 3.13137C11.2692 3.17066 11.5154 3.19031 11.7207 3.26285C12.1957 3.43063 12.5694 3.80427 12.7372 4.27929C12.8097 4.48466 12.8294 4.73083 12.8686 5.22317C12.8843 5.41912 12.8921 5.51709 12.9107 5.61145C12.9534 5.82775 13.0386 6.03343 13.1614 6.21657C13.2149 6.29646 13.2787 6.37127 13.4062 6.52089C13.7265 6.8968 13.8867 7.08476 13.9806 7.28128C14.1979 7.73581 14.1979 8.26421 13.9806 8.71874C13.8867 8.91526 13.7265 9.10321 13.4062 9.47913C13.2787 9.62875 13.2149 9.70355 13.1614 9.78345C13.0386 9.96659 12.9534 10.1723 12.9107 10.3886C12.8921 10.4829 12.8843 10.5809 12.8686 10.7768C12.8294 11.2692 12.8097 11.5154 12.7372 11.7207C12.5694 12.1957 12.1957 12.5694 11.7207 12.7372C11.5154 12.8097 11.2692 12.8294 10.7768 12.8686C10.5809 12.8843 10.4829 12.8921 10.3886 12.9107C10.1723 12.9534 9.96659 13.0386 9.78345 13.1614C9.70355 13.2149 9.62875 13.2787 9.47913 13.4062C9.10321 13.7265 8.91526 13.8867 8.71874 13.9806C8.26421 14.1979 7.73581 14.1979 7.28128 13.9806C7.08476 13.8867 6.8968 13.7265 6.52089 13.4062C6.37127 13.2787 6.29646 13.2149 6.21657 13.1614C6.03343 13.0386 5.82775 12.9534 5.61145 12.9107C5.51709 12.8921 5.41912 12.8843 5.22317 12.8686C4.73083 12.8294 4.48466 12.8097 4.27929 12.7372C3.80427 12.5694 3.43063 12.1957 3.26285 11.7207C3.19031 11.5154 3.17066 11.2692 3.13137 10.7768C3.11574 10.5809 3.10792 10.4829 3.08929 10.3886C3.04659 10.1723 2.96139 9.96659 2.83864 9.78345C2.78509 9.70355 2.72134 9.62875 2.59384 9.47913C2.27349 9.10321 2.11331 8.91526 2.01938 8.71874C1.80213 8.26421 1.80213 7.73581 2.01938 7.28128C2.11331 7.08476 2.27349 6.8968 2.59384 6.52089C2.72134 6.37127 2.78509 6.29646 2.83864 6.21657C2.96139 6.03343 3.04659 5.82775 3.08929 5.61145C3.10792 5.51709 3.11574 5.41912 3.13137 5.22317C3.17066 4.73083 3.19031 4.48466 3.26285 4.27929C3.43063 3.80427 3.80427 3.43063 4.27929 3.26285C4.48466 3.19031 4.73083 3.17066 5.22317 3.13137C5.41912 3.11574 5.51709 3.10792 5.61145 3.08929C5.82775 3.04659 6.03343 2.96139 6.21657 2.83864C6.29646 2.78509 6.37127 2.72134 6.52089 2.59384Z" stroke="white" />
                                        <path d="M6 10L10 6" stroke="white" strokeLinecap="round" />
                                        <path d="M10.3333 9.66667C10.3333 10.0349 10.0349 10.3333 9.66667 10.3333C9.29848 10.3333 9 10.0349 9 9.66667C9 9.29848 9.29848 9 9.66667 9C10.0349 9 10.3333 9.29848 10.3333 9.66667Z" fill="white" />
                                        <path d="M6.99999 6.33329C6.99999 6.70148 6.70151 6.99996 6.33332 6.99996C5.96513 6.99996 5.66666 6.70148 5.66666 6.33329C5.66666 5.9651 5.96513 5.66663 6.33332 5.66663C6.70151 5.66663 6.99999 5.9651 6.99999 6.33329Z" fill="white" />
                                    </svg>
                                    <span className="justify-center text-white text-sm font-medium leading-4">
                                        {t("discount")} {flatData?.discountPercent != null && flatData.discountPercent > 0
                                            ? `${flatData.discountPercent}%`
                                            : conditionDiscount > 0 && basePrice > 0
                                                ? `${Math.round((conditionDiscount / basePrice) * 100)}%`
                                                : ""}
                                    </span>
                                </div>
                            </div>
                        )}
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
                    base: `w-full bg-[#F4F6FB] rounded-[16px] px-[16px] py-[8px] ${promocodeResult?.valid === false ? 'bg-danger-50' : 'bg-[#F4F6FB]'}`,
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
                    {bonusPhoneStep !== "code" && (
                        <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">{t("client_phone")}</span>
                    )}
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
                                <p className="text-danger-500 text-[12px]">{bonusVerifyError}</p>
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
                                        ref={(el: HTMLInputElement | null) => { bonusCodeInputsRef.current[i] = el; }}
                                        classNames={{
                                            input: "text-center text-[16px] font-medium text-[#1A3C7E] bg-[#F4F6FB] rounded-[12px] h-[48px]",
                                            inputWrapper: "p-0 w-full h-[48px]",
                                        }}
                                    />
                                ))}
                            </div>
                            {bonusVerifyError && (
                                <p className="text-danger-500 text-[12px]">{bonusVerifyError}</p>
                            )}
                            <Button
                                onPress={verifyBonusCode}
                                isDisabled={bonusVerificationCode.join("").length !== 4 || isVerifyingBonusCode}
                                className="w-full rounded-[12px] bg-[#1A3C7E] text-white"
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
                            <Button onPress={() => { setBonusPhoneStep("phone"); setBonusVerifyError(null); }} className="flex justify-end !p-0 !min-h-0 h-auto !bg-transparent text-[#2655AF] text-[14px]">
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

            <div className="flex flex-col gap-2 w-full">
                <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70">
                    Gala Bonus
                </span>
                <div className="flex p-[16px] items-center gap-[9px] self-stretch rounded-[16px] bg-[#F4F6FB]">
                    <div className="flex justify-between items-center gap-[4.094px] flex-[1_0_0]">
                        <div className="flex flex-col justify-between items-start gap-[8px]">
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
            </div>
            <div className="flex w-full p-[32px] flex-col items-start gap-[16px] rounded-[32px] bg-[#F4F6FB]">
                <div className="flex items-start self-stretch">
                    <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">{t("apartment_price")}</h1>
                </div>
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("price")}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {totalPriceDisplay}
                        </span>
                    </div>
                    {realEstateType !== "parking" && (
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("price_per_square_meter")}
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {basePriceM2}
                        </span>
                    </div>
                    )}
                    {conditionDiscount > 0 && (
                        <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                            <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                                {t("discount")}
                            </span>
                            <span className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">
                                {formatPriceDisplay(conditionDiscount)}
                            </span>
                        </div>
                    )}
                    {(promocodeResult?.valid && promocodeResult?.code != null) && (
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
                            Gala Bonus
                        </span>
                        <span className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">
                            {galaBonus}
                        </span>
                    </div>
                    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("reservation")} {" "}
                            <span className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">
                            </span>
                        </span>
                        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                            {t("reservation_time")}
                        </span>
                    </div>
                    <div className="flex items-center justify-between w-full flex-row gap-3 self-stretch">
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
                                    value={calendarValue}
                                    onChange={onPaymentDayToggle}
                                    minValue={today(getLocalTimeZone())}
                                    classNames={{
                                        base: "bg-transparent",
                                        gridBody: "bg-[#F4F6FB]",
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2 self-stretch">
                        <div className="flex flex-col gap-2 self-stretch">
                            {sortedPaymentDates.map((d, i) => {
                                const dateKey = calendarDateToRu(d);
                                const isLast = dateKey === lastDateKey;
                                return (
                                    <div
                                        key={dateKey}
                                        className="flex justify-between flex-wrap items-center gap-2 py-1 border-b border-black/10 last:border-0"
                                    >
                                        <span className="text-[#1A3C7E] text-[14px] font-medium min-w-[90px]">
                                            {dateKey}
                                        </span>
                                        {isLast ? (
                                            <span className={`text-[14px] ${remainingRaw < 0 ? "text-red-600" : "text-[#000] opacity-80"}`}>
                                                {t("remaining")}: {formatPriceDisplay(remainingRaw)}
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
                    </div>
                </div>
                <div className="flex p-[16px] flex-col justify-center items-start gap-[9px] self-stretch rounded-[16px] bg-[#FFF]">
                    <div className="flex items-center gap-[4.094px] self-stretch">
                        <div className="flex flex-col justify-center items-start gap-[8px]">
                            <span className="overflow-hidden text-[#1E1E1E] text-center overflow-ellipsis text-[14px] not-italic font-normal leading-[14px] opacity-20">
                                {t("total_price")}
                            </span>
                            <h1 className="overflow-hidden text-[#2655AF] text-center overflow-ellipsis text-[24px] not-italic font-medium leading-[24px]">
                                {totalPriceDisplay}
                            </h1>
                        </div>
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
