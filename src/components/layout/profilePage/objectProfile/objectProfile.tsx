"use client"
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@heroui/button";
import { useTranslations } from "next-intl";
import type { MyDealItem } from "@/app/api/profile/my-deals/route";
import { DocumentLink } from "@/components/common/DocumentLink";

type Step = {
    title: string;
    desc: string;
    active: boolean;
};

type DataItem = {
    id: number;
    dealDocumentId: string;
    managerPhone: string | null;
    title: string;
    address: string;
    room: string;
    deadline: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    statusTextColor: string;
    buyType: string;
    buyTypeKey: string;
    firstFee: string;
    price: string;
    image: string;
    plan: string;
    characteristics: [string, string][];
    steps: Step[];
    paymentCalendar: { month: string; amount: string }[];
    deferredPayments: { label: string; amount: string; date: string }[] | null;
};

type ExpandedState = Record<string, boolean>;

type PropertyDetail = {
    projectName?: string;
    complexAddress?: string;
    district?: string;
    room?: number;
    totalArea?: number;
    floor?: number;
    section?: string;
    entrance?: number;
    complexDueDate?: string;
    /** Hero-фото ЖК (complexHeroImage) */
    complexHeroImage?: string;
    /** Планировки квартиры (plan) */
    images?: string[];
    platformPlanImages?: string[];
    apartmentNumber?: number | string;
    priceCheckmate?: number;
    house?: number;
};

const DEAL_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    "Бронь": { bg: "#FCF2D4", text: "#D9A403" },
    "Ожидания оплаты": { bg: "#D5DCF0", text: "#4F6FBF" },
    "Ожидания договора": { bg: "#D5DCF0", text: "#4F6FBF" },
    "Договор подписан": { bg: "#CBECD9", text: "#27AE60" },
};

const STEP_ORDER_KEYS = [
    { key: "Бронь", titleKey: "step_apartment_reserved" as const, descKey: "step_apartment_reserved_desc" as const },
    { key: "Ожидания договора", titleKey: "step_contract_issued" as const, descKey: "step_contract_issued_desc" as const },
    { key: "Ожидания оплаты", titleKey: "step_payment" as const, descKey: "step_payment_desc" as const },
    { key: "Договор подписан", titleKey: "step_payment_done" as const, descKey: "step_payment_done_desc" as const },
];

const STATUS_TO_KEY: Record<string, string> = {
    "Бронь": "status_reservation",
    "Ожидания оплаты": "status_awaiting_payment",
    "Оплачено": "status_paid",
    "Оплачен": "status_paid",
    "Ожидания договора": "status_awaiting_contract",
    "Договор подписан": "status_contract_signed",
    "Отменен": "status_canceled",
    "Просрочен": "status_overdue",
    "Расторжение": "status_canceled",
    "Расторгнут": "status_canceled",
};

const BUYTYPE_TO_KEY: Record<string, string> = {
    "100% оплата": "full_payment",
    "Рассрочка": "installment",
    "Отсроченный платеж": "deffered",
};

function formatPrice(amount: number | string): string {
    return Number(amount).toLocaleString("ru-RU").replace(/\u00A0/g, " ") + " ₸";
}

function formatDueDate(isoDate: string): string {
    if (!isoDate) return "";
    const d = new Date(isoDate.replace("Z", "").replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Определение типа оплаты по графику (только если в сделке нет paymentMethod). */
function inferBuyTypeFromSchedules(schedules: MyDealItem["paymentSchedules"]): string {
    if (!schedules || schedules.length === 0) return "100% оплата";
    if (schedules.length === 1) return "100% оплата";
    if (schedules.length === 2) return "Отсроченный платеж";
    return "Рассрочка";
}

/** Итоговый способ оплаты: из сделки или по графику. */
function getBuyType(deal: MyDealItem): string {
    if (deal.paymentMethod && deal.paymentMethod.trim()) return deal.paymentMethod.trim();
    return inferBuyTypeFromSchedules(deal.paymentSchedules);
}

/** Номер для wa.me: только цифры, для Казахстана 7 в начале (без +) */
function phoneToWhatsApp(phone: string | null | undefined): string {
    if (!phone || typeof phone !== "string") return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.startsWith("8") && digits.length >= 10) return "7" + digits.slice(1);
    if (digits.length === 10) return "7" + digits;
    return digits.startsWith("7") ? digits : "7" + digits;
}

function ObjectProfileSkeleton() {
    return (
        <div className="wrapper flex flex-col gap-[16px]">
            <div className="h-[clamp(24px,3vw,45px)] w-[200px] rounded-[8px] bg-[#E5E7EB] animate-pulse" />
            {[1, 2].map((i) => (
                <div
                    key={i}
                    className="flex flex-col p-[16px] gap-[24px] rounded-[32px] bg-[#F4F6FB]"
                >
                    <div className="flex gap-[16px] flex-col lg:flex-row">
                        <div className="rounded-[16px] w-full lg:w-[300px] h-[175px] bg-[#E5E7EB] animate-pulse shrink-0" />
                        <div className="flex flex-col gap-[12px] flex-1 min-w-0">
                            <div className="h-[20px] w-3/4 max-w-[240px] rounded-[6px] bg-[#E5E7EB] animate-pulse" />
                            <div className="h-[14px] w-full max-w-[320px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                            <div className="flex gap-[16px] flex-wrap mt-[4px]">
                                <div className="h-[14px] w-[140px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                                <div className="h-[14px] w-[80px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                            </div>
                            <div className="flex gap-[24px] flex-wrap items-center mt-[8px]">
                                <div className="h-[14px] w-[60px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                                <div className="h-[28px] w-[90px] rounded-[12px] bg-[#E5E7EB] animate-pulse" />
                                <div className="h-[14px] w-[100px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                                <div className="h-[14px] w-[120px] rounded-[6px] bg-[#E5E7EB]/80 animate-pulse" />
                            </div>
                            <div className="h-[36px] w-[120px] rounded-[32px] bg-[#E5E7EB] animate-pulse mt-[4px]" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ObjectProfile() {
    type DownloadAgreementItem = {
        url: string;
        name?: string;
        templateType?: string;
    };
    const agreementLabel = (a: DownloadAgreementItem): string => {
        const name = (a.name ?? "").trim();
        const type = (a.templateType ?? "").trim();
        if (!name && !type) return "Договор";
        if (!name) return type;
        if (!type) return name;
        if (name.toLowerCase().includes(type.toLowerCase())) return name;
        if (name.toLowerCase() === "dogovor.pdf" || name.toLowerCase() === "договор.pdf") return type;
        return `${type} - ${name}`;
    };
    const t = useTranslations();
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [data, setData] = useState<DataItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agreementLoadingDealId, setAgreementLoadingDealId] = useState<string | null>(null);
    const [agreementsByDeal, setAgreementsByDeal] = useState<Record<string, DownloadAgreementItem[]>>({});

    const loadDealAgreements = async (dealDocumentId: string) => {
        if (agreementLoadingDealId) return;
        setAgreementLoadingDealId(dealDocumentId);
        try {
            const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/signed-agreement`, { credentials: "include" });
            const json = await res.json().catch(() => ({}));
            const agreements: DownloadAgreementItem[] = Array.isArray(json?.agreements)
                ? json.agreements.filter((a: unknown): a is DownloadAgreementItem => !!a && typeof (a as DownloadAgreementItem).url === "string")
                : [];
            if (agreements.length > 0) {
                setAgreementsByDeal((prev) => ({ ...prev, [dealDocumentId]: agreements }));
            } else if (res.status === 404) {
                alert(t("agreement_not_found"));
            } else {
                alert(json?.error ?? t("failed_to_get_agreement"));
            }
        } catch {
            alert(t("load_error"));
        } finally {
            setAgreementLoadingDealId(null);
        }
    };

    const toggleExpanded = (key: string) => {
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const buildDataItems = useCallback(async (deals: MyDealItem[]): Promise<DataItem[]> => {
        const roomSuffix = t("room_rooms");
        const propIds = [...new Set(deals.map(d => d.propertyDocumentId).filter((id): id is string => !!id))];
        const propMap = new Map<string, PropertyDetail | null>();
        if (propIds.length > 0) {
            const results = await Promise.all(
                propIds.map(id =>
                    fetch(`/api/properties/${encodeURIComponent(id)}`, { credentials: "include" })
                        .then(r => (r.ok ? r.json() : null))
                        .catch(() => null)
                )
            );
            propIds.forEach((id, i) => propMap.set(id, results[i]));
        }

        const items: DataItem[] = [];
        for (let i = 0; i < deals.length; i++) {
            const deal = deals[i];
            const prop = deal.propertyDocumentId ? propMap.get(deal.propertyDocumentId) ?? null : null;

            const price = deal.dealPrice ?? prop?.priceCheckmate ?? 0;
            const downPayment = deal.downPayment ?? 0;
            const buyType = getBuyType(deal);
            const buyTypeKey = BUYTYPE_TO_KEY[buyType] ?? "full_payment";
            const firstFeeStr = downPayment > 0 ? formatPrice(downPayment) : "";
            const priceStr = price > 0 ? formatPrice(price) : "—";

            const statusStyle = DEAL_STATUS_STYLE[deal.dealStatus] ?? { bg: "#E5E7EB", text: "#374151" };
            const statusTranslationKey = STATUS_TO_KEY[deal.dealStatus];
            const statusLabel = statusTranslationKey ? t(statusTranslationKey) : deal.dealStatus;
            const reached: Record<string, boolean> = {
                "Бронь": ["Бронь", "Ожидания оплаты", "Ожидания договора", "Договор подписан"].includes(deal.dealStatus),
                "Ожидания договора": ["Ожидания договора", "Договор подписан"].includes(deal.dealStatus),
                "Ожидания оплаты": ["Ожидания оплаты", "Ожидания договора", "Договор подписан"].includes(deal.dealStatus),
                "Договор подписан": deal.dealStatus === "Договор подписан",
            };
            const steps: Step[] = STEP_ORDER_KEYS.map(({ key, titleKey, descKey }) => ({
                title: t(titleKey),
                desc: t(descKey),
                active: reached[key] ?? false,
            }));

            const roomStr = prop?.room != null && prop?.totalArea != null
                ? `${prop.room}-${roomSuffix} (${prop.totalArea} м²)`
                : prop?.room != null ? `${prop.room}-${roomSuffix}` : "—";
            const deadline = prop?.complexDueDate
                ? (() => {
                    const d = new Date(prop!.complexDueDate!);
                    if (Number.isNaN(d.getTime())) return prop!.complexDueDate!;
                    const q = Math.floor(d.getMonth() / 3) + 1;
                    return `${q}кв ${d.getFullYear()}`;
                })()
                : "—";

            const characteristics: [string, string][] = [
                [t("residential_complex"), prop?.projectName ?? "—"],
                [t("section"), prop?.section ?? "—"],
                [t("entrance"), String(prop?.entrance ?? "—")],
                [t("floor"), String(prop?.floor ?? "—")],
                [t("apartment"), prop?.apartmentNumber != null ? `№${prop.apartmentNumber}` : "—"],
                [t("area"), prop?.totalArea != null ? `${prop.totalArea} м²` : "—"],
            ];

            const image = prop?.complexHeroImage ?? (prop?.images && prop.images.length > 0 ? prop.images[0] : null) ?? "/img/project.jpg";
            const plan = (prop?.images && prop.images.length > 0) ? prop.images[0] : "/img/plan.svg";

            let paymentCalendar: { month: string; amount: string }[] = [];
            let deferredPayments: { label: string; amount: string; date: string }[] | null = null;

            if (deal.paymentSchedules.length > 0) {
                if (buyType === "Рассрочка") {
                    paymentCalendar = deal.paymentSchedules.map(s => {
                        const monthName = s.dueDate
                            ? (() => {
                                const d = new Date(s.dueDate.replace("Z", "").replace(" ", "T"));
                                return d.toLocaleString("ru-RU", { month: "short" });
                            })()
                            : "";
                        const month = monthName ? monthName.charAt(0).toUpperCase() + monthName.slice(1) : "";
                        return { month, amount: formatPrice(s.amount) };
                    });
                } else if (buyType === "Отсроченный платеж" && deal.paymentSchedules.length === 2) {
                    deferredPayments = deal.paymentSchedules.map((s, idx) => ({
                        label: idx === 0 ? t("first_payment") : t("last_payment"),
                        amount: formatPrice(s.amount),
                        date: formatDueDate(s.dueDate),
                    }));
                }
            }

            items.push({
                id: i,
                dealDocumentId: deal.documentId,
                managerPhone: deal.managerPhone ?? null,
                title: prop?.projectName ?? t("object_default"),
                address: prop?.complexAddress ?? (prop?.district ? `Астана, ${prop.district}` : "—"),
                room: roomStr,
                deadline,
                status: deal.dealStatus,
                statusLabel,
                statusColor: statusStyle.bg,
                statusTextColor: statusStyle.text,
                buyType,
                buyTypeKey,
                firstFee: firstFeeStr,
                price: priceStr,
                image,
                plan,
                characteristics,
                steps,
                paymentCalendar,
                deferredPayments,
            });
        }
        return items;
    }, [t]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch("/api/profile/my-deals", { credentials: "include" })
            .then(res => {
                if (!res.ok) throw new Error(res.status === 401 ? "unauthorized" : "server_error");
                return res.json();
            })
            .then(async (json: { deals?: MyDealItem[] }) => {
                const deals = json?.deals ?? [];
                if (cancelled) return;
                const items = await buildDataItems(deals);
                if (cancelled) return;
                setData(items);
            })
            .catch(err => {
                if (!cancelled) setError(err?.message === "unauthorized" ? null : (err?.message || t("load_error")));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [buildDataItems]);

    if (loading) {
        return <ObjectProfileSkeleton />;
    }

    if (error) {
        return (
            <div className="wrapper flex flex-col gap-[16px]">
                <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">{t("my_objects")}</h1>
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="wrapper flex flex-col gap-[16px]">
                <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">{t("my_objects")}</h1>
                <p className="text-[rgba(18,44,94,0.50)]">{t("no_data")}</p>
            </div>
        );
    }

    return (
        <div className="wrapper flex flex-col gap-[16px]">
            <h1 className="text-[#000] [font-size:_clamp(24px,3vw,45px)] not-italic font-medium leading-[100%]">{t("my_objects")}</h1>
            {data.map(item => {
                const payments = item.paymentCalendar;
                const isExpanded = expanded[item.dealDocumentId];

                return (
                    <div
                        key={item.dealDocumentId}
                        className="flex flex-col p-[16px] gap-[24px] rounded-[32px] bg-[#F4F6FB]"
                    >
                        {/* TOP BLOCK */}
                        <div className="flex gap-[16px] flex-col lg:flex-row">
                            <Image
                                src={item.image}
                                alt={item.title}
                                width={300}
                                height={175}
                                className="rounded-[16px] w-full lg:w-[300px]"
                                unoptimized={true}
                            />

                            <div className="flex flex-col gap-[12px] flex-1">
                                <div className="flex flex-col gap-[16px]">
                                    <div className="flex flex-col gap-[12px]">
                                        <h1 className="text-[#202028] text-[20px] font-medium tracking-[-0.9px]">
                                            {item.title}
                                        </h1>
                                        <p className="text-[rgba(18,44,94,0.50)] text-[14px]">
                                            {item.address}
                                        </p>
                                    </div>

                                    <div className="flex gap-[16px] flex-col lg:flex-row">
                                        <span className="text-[#202028] text-[14px] tracking-[-0.9px]">
                                            {item.room}
                                        </span>
                                        <span className="text-[#202028] text-[14px] tracking-[-0.9px]">
                                            {t("deadline_label")}: {item.deadline}
                                        </span>
                                    </div>
                                </div>

                                {/* Status + type */}
                                <div className="flex gap-[24px] flex-col lg:flex-row">
                                    <div className="flex gap-[12px] items-center">
                                        <div className="text-[#1E1E1E] text-[14px]">{t("status_label")}:</div>
                                        <div
                                            className="px-[12px] py-[4px] rounded-[12px]"
                                            style={{ background: item.statusColor }}
                                        >
                                            <span style={{ color: item.statusTextColor }} className="text-[14px]">
                                                {item.statusLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-[12px] items-center">
                                        <div className="text-[#1E1E1E] text-[14px]">{t("purchase_method_label")}:</div>
                                        <span className="text-[rgba(30,30,30,0.50)] text-[14px]">
                                            {t(item.buyTypeKey)}
                                        </span>
                                    </div>

                                </div>
                                <div className="flex flex-col justify-center items-start gap-[10px] self-stretch">
                                    {/* Expand button */}
                                    <Button
                                        className="flex h-[36px] min-w-[36px] min-h-[36px] pl-[11px] pr-[11px] py-[9px] justify-center items-center rounded-[32px] bg-[#FFF]"
                                        onClick={() => toggleExpanded(item.dealDocumentId)}
                                    >
                                        <span className="text-black text-[15px]">
                                            {isExpanded ? t("show_less") : t("show_more")}
                                        </span>
                                        <svg className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M12.6663 10L7.99967 6L3.33301 10" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* EXPANDED CONTENT */}
                        {isExpanded && (
                            <div className="flex gap-[16px] pb-[16px] flex-col lg:flex-row flex-wrap">
                                <Image
                                    src={item.plan}
                                    alt="plan"
                                    width={300}
                                    height={175}
                                    className="object-contain rounded-[32px] bg-white p-[16px]"
                                />

                                {/* characteristics */}
                                <div className="flex flex-col bg-white rounded-[32px] p-[16px] flex-1">
                                    <h1 className="text-[16px] font-medium">{t("characteristics")}</h1>

                                    <div className="flex h-full flex-col gap-[4px] mt-[8px]">
                                        {item.characteristics.map(([name, value], i) => (
                                            <div
                                                key={i}
                                                className="flex h-full items-center justify-between pb-[8px] border-b border-[rgba(38,85,175,0.16)]"
                                            >
                                                <span className="text-[12px]">{name}</span>
                                                <span className="text-[12px]">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* price block */}
                                <div className="flex h-full flex-col flex-1 gap-[16px]">
                                    <div className="h-full justify-between bg-[#1A3C7E] rounded-[32px] p-[32px] flex flex-col gap-[16px]">
                                        <span className="text-white text-[16px] font-medium">
                                            {t("apartment_price")}
                                        </span>
                                        <span className="text-white text-[24px] font-medium">
                                            {item.price}
                                        </span>
                                        {item.buyType !== "Рассрочка" && item.buyType !== "Отсроченный платеж" && (
                                            <span className="text-white text-[16px] font-medium">
                                                {t("initial_payment_label")}: <br></br>{item.firstFee}
                                            </span>
                                        )}
                                    </div>
                                    {item.buyType === "Рассрочка" && payments.length > 0 && (
                                        <div className="h-full justify-between bg-[#FFF] rounded-[32px] p-[32px] flex flex-col gap-[16px]">
                                            <span className="text-black text-[18px] font-medium">
                                                {t("payment_calendar")}
                                            </span>
                                            <div className="flex flex-col items-start gap-[4px] h-[165px] self-stretch overflow-y-auto">
                                                {Array.from({ length: Math.ceil(payments.length / 4) }).map((_, rowIndex) => (
                                                    <div key={rowIndex} className="flex items-start gap-[4px] self-stretch">
                                                        {payments.slice(rowIndex * 4, rowIndex * 4 + 4).map((p, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex h-auto p-[8px] flex-col items-start gap-[16px] flex-[1_0_0] rounded-[8px] bg-[#F4F6FB]"
                                                            >
                                                                <span className="text-[#000] text-[12px]">{p.month}</span>
                                                                <span className="text-[#000] text-[8px]">{p.amount}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {item.buyType === "Отсроченный платеж" && item.deferredPayments && item.deferredPayments.length > 0 && (
                                        <div className="h-full justify-between bg-[#FFF] rounded-[32px] p-[32px] flex flex-col gap-[16px]">
                                            <span className="text-black text-[18px] font-medium">{t("payment_calendar")}</span>
                                            <div className="flex flex-col items-start gap-[4px] h-auto self-stretch overflow-y-auto">
                                                <div className="flex items-start gap-[4px] self-stretch">
                                                    {item.deferredPayments.map((p, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex h-auto p-[8px] flex-col items-start gap-[8px] flex-[1_0_0] rounded-[8px] bg-[#F4F6FB]"
                                                        >
                                                            <span className="text-[#000] text-[12px]">{p.label}</span>
                                                            <span className="text-[#000] text-[12px]">{p.amount}</span>
                                                            <span className="text-[#000] text-[12px]">{p.date}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* steps */}
                        {isExpanded && (
                            <div className="flex gap-[16px] flex-col lg:flex-row">
                                {item.steps.map((step, i) => (
                                    <div key={i} className="flex flex-col flex-1 gap-[16px]">

                                        <div className="flex items-center gap-[11px]">
                                            <div
                                                className={`w-[16px] h-[16px] rounded-full ${step.active ? "bg-[#2655AF]" : "bg-[#1E1E1E] opacity-50"
                                                    }`}
                                            ></div>
                                            <div
                                                className={`h-[2px] flex-1 ${step.active ? "bg-[#2655AF] opacity-30" : "bg-[#1E1E1E] opacity-30"
                                                    }`}
                                            ></div>
                                        </div>

                                        <div className="flex flex-col gap-[8px]">
                                            <span className={`text-[16px] font-medium ${step.active ? "" : "opacity-50"}`}>
                                                {step.title}
                                            </span>
                                            <p className={`text-[14px] opacity-50`}>
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* buttons */}
                        {isExpanded && (
                            <div className="flex gap-[16px] flex-col lg:flex-row">
                                <Button
                                    className="bg-[#1A3C7E] text-white rounded-[32px] h-[44px] px-[13px]"
                                    isLoading={agreementLoadingDealId === item.dealDocumentId}
                                    isDisabled={agreementLoadingDealId !== null}
                                    onPress={() => loadDealAgreements(item.dealDocumentId)}
                                >
                                    <Image src="/img/agreement.svg" width={16} height={16} alt="Agreement" />
                                    <span className="text-[15px]">
                                        {(agreementsByDeal[item.dealDocumentId] ?? []).length > 0 ? "Обновить договоры" : t("download_contract")}
                                    </span>
                                </Button>
                                {(agreementsByDeal[item.dealDocumentId] ?? []).length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        {(agreementsByDeal[item.dealDocumentId] ?? []).map((a) => (
                                            <DocumentLink
                                                key={`${item.dealDocumentId}-${a.url}`}
                                                href={a.url}
                                                className="text-xs text-[#1A3C7E] underline underline-offset-2"
                                                title={agreementLabel(a)}
                                            >
                                                {agreementLabel(a)}
                                            </DocumentLink>
                                        ))}
                                    </div>
                                )}

                                {item.managerPhone ? (
                                    <Button
                                        as="a"
                                        href={`https://wa.me/${phoneToWhatsApp(item.managerPhone)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white rounded-[32px] h-[44px] px-[13px]"
                                    >
                                        <Image src="/img/chat.svg" width={16} height={16} alt="Chat" />
                                        <span className="text-[15px]">{t("write_to_manager")}</span>
                                    </Button>
                                ) : (
                                    <Button className="bg-white rounded-[32px] h-[44px] px-[13px]" isDisabled>
                                        <Image src="/img/chat.svg" width={16} height={16} alt="Chat" />
                                        <span className="text-[15px]">{t("write_to_manager")}</span>
                                    </Button>
                                )}
                            </div>
                        )}

                    </div>
                );
            })}
        </div>
    );
}
