"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, Button } from "@heroui/react";
import type { DealFull } from "./types";
import { RenewalContactsStep } from "./RenewalContactsStep";
import { RenewalCostStep } from "./RenewalCostStep";
import { RenewalSignStep } from "./RenewalSignStep";
import { TerminationSignStep } from "./TerminationSignStep";
import { useTranslations } from "next-intl";

function formatPrice(input: unknown): string {
    if (input == null) return "—";

    // Превращаем в строку
    let s = String(input);

    // Убираем nbsp, пробелы и символ тенге
    s = s
        .replace(/\u00A0/g, "")
        .replace(/\s/g, "")
        .replace(/₸/g, "");

    // Оставляем только цифры
    if (!/^\d+$/.test(s)) return "—";

    // Разбиваем вручную по 3 цифры
    const parts = [];
    while (s.length > 3) {
        parts.unshift(s.slice(-3));
        s = s.slice(0, -3);
    }
    if (s) parts.unshift(s);

    return parts.join(" ") + " ₸";
}



function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

type DownloadAgreementItem = {
    url: string;
    name?: string;
    templateType?: string;
};

function agreementLabel(a: DownloadAgreementItem): string {
    const name = (a.name ?? "").trim();
    const type = (a.templateType ?? "").trim();
    if (!name && !type) return "Договор";
    if (!name) return type;
    if (!type) return name;
    if (name.toLowerCase().includes(type.toLowerCase())) return name;
    if (name.toLowerCase() === "dogovor.pdf" || name.toLowerCase() === "договор.pdf") return type;
    return `${type} - ${name}`;
}

export default function DealDrawer({
    dealDocumentId,
    onClose,
    onUpdated,
}: {
    dealDocumentId: string;
    onClose: () => void;
    onUpdated?: () => void;
}) {
    const t = useTranslations();
    const [data, setData] = useState<DealFull | null>(null);
    const [planImage, setPlanImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [agreementDownloadLoading, setAgreementDownloadLoading] = useState(false);
    const [agreementFiles, setAgreementFiles] = useState<DownloadAgreementItem[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    type RenewalStep = "contacts" | "cost" | "sign";
    const [renewalStep, setRenewalStep] = useState<RenewalStep | null>(null);
    const [renewalNewCustomerDocumentId, setRenewalNewCustomerDocumentId] = useState<string | null>(null);
    const [renewalTypedSum, setRenewalTypedSum] = useState<number>(0);
    const [terminationActive, setTerminationActive] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPlanImage(null);
        setAgreementFiles([]);
        fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/full`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error(res.status === 404 ? "Сделка не найдена" : "Ошибка загрузки");
                return res.json();
            })
            .then(async (json) => {
                if (cancelled) return;
                setData(json);
                const propId = json?.deal?.property?.documentId;
                if (propId) {
                    try {
                        const type = json?.deal?.property?.type ?? json?.deal?.realEstateType ?? "property";
                        const pRes = await fetch(
                            `/api/properties/${encodeURIComponent(propId)}?type=${encodeURIComponent(type)}`,
                            { credentials: "include" }
                        );
                        if (pRes.ok) {
                            const prop = await pRes.json();
                            const img = prop?.images?.[0] ?? prop?.platformPlanImages?.[0];
                            if (img && !cancelled) setPlanImage(img);
                        }
                    } catch {
                        // ignore
                    }
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message ?? "Ошибка");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [dealDocumentId]);

    const handleRelease = async () => {
        if (actionLoading) return;
        setActionLoading("release");
        try {
            const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/release`, {
                method: "POST",
                credentials: "include",
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.released) {
                onUpdated?.();
                onClose();
            } else {
                alert(json?.error ?? "Не удалось отменить бронь");
            }
        } catch {
            alert("Ошибка сети");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadAgreement = async () => {
        if (agreementDownloadLoading) return;
        setAgreementDownloadLoading(true);
        try {
            const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/signed-agreement`, { credentials: "include" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(json?.error ?? "Договор не найден или ещё не подписан");
                return;
            }
            const agreements: DownloadAgreementItem[] = Array.isArray(json?.agreements)
                ? json.agreements.filter((a: unknown): a is DownloadAgreementItem => !!a && typeof (a as DownloadAgreementItem).url === "string")
                : [];
            if (agreements.length > 0) {
                setAgreementFiles(agreements);
            } else {
                alert("Договор не найден");
            }
        } catch {
            alert("Ошибка сети");
        } finally {
            setAgreementDownloadLoading(false);
        }
    };

    const isReserve = data?.deal?.dealStatus === "Бронь";
    const canRenewOrTerminate =
        data?.deal?.dealStatus === "Оплачено" || data?.deal?.dealStatus === "Договор подписан";
    const propertyType = data?.deal?.property?.type ?? data?.deal?.realEstateType ?? "property";
    const propertyTypeLabel = data?.deal?.property?.typeLabel ?? "Объект недвижимости";
    const isResidential = propertyType === "property";
    const stepsOrder: RenewalStep[] = ["contacts", "cost", "sign"];
    const currentRenewalIndex = renewalStep ? stepsOrder.indexOf(renewalStep) : -1;

    const exitRenewal = () => {
        setRenewalStep(null);
        setRenewalNewCustomerDocumentId(null);
        setRenewalTypedSum(0);
    };

    const exitTermination = () => {
        setTerminationActive(false);
    };

    const canGoBackInRenewal = renewalStep != null && renewalStep !== "sign";
    const handleRenewalBack = () => {
        if (!renewalStep) return;
        if (renewalStep === "cost") {
            setRenewalStep("contacts");
            return;
        }
        exitRenewal();
    };

    return (
        <Drawer
            isOpen
            hideCloseButton
            onOpenChange={(open) => {
                if (!open) { if (renewalStep) exitRenewal(); if (terminationActive) exitTermination(); onClose(); }
            }}
            placement={isMobile ? "bottom" : "right"}
            classNames={{
                base: "fixed flex w-full max-w-[600px] min-h-[75vh] bottom-0 h-full px-[16px] py-[24px] lg:px-[40px] lg:py-[64px] flex-col gap-[10px] rounded-t-[32px] bg-[#FFF]",
            }}
        >
            <DrawerContent className="flex flex-col gap-[32px] h-full self-stretch">
                {renewalStep ? (
                    <>
                        <div className="self-stretch h-4 inline-flex justify-start items-center gap-6">
                            {stepsOrder.map((s, index) => (
                                <div
                                    key={s}
                                    className={`flex-1 h-0 outline outline-[3px] outline-offset-[-1.5px] outline-blue-800 ${index <= currentRenewalIndex ? "" : "opacity-20"}`}
                                />
                            ))}
                        </div>
                        <DrawerHeader className="flex items-start justify-between gap-[32px] self-stretch text-[#122C5E] text-[32px] not-italic font-normal leading-[100%] bg-white p-0">
                            <div className="flex flex-col items-start gap-[16px] self-stretch flex-1 min-w-0">
                                <div className="flex justify-between items-center self-stretch gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {canGoBackInRenewal && (
                                            <Button
                                                isIconOnly
                                                variant="light"
                                                size="sm"
                                                aria-label="Назад"
                                                className="shrink-0 text-[#122C5E] min-w-8 w-8 h-8"
                                                onPress={handleRenewalBack}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M15 18l-6-6 6-6" />
                                                </svg>
                                            </Button>
                                        )}
                                        <span className="truncate">
                                            {renewalStep === "contacts" && "Данные нового клиента"}
                                            {renewalStep === "cost" && "Стоимость договора"}
                                            {renewalStep === "sign" && "Подписать договор переоформления"}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        isIconOnly
                                        onPress={exitRenewal}
                                        aria-label="Закрыть"
                                        className="text-[#122C5E] shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </DrawerHeader>
                        <DrawerBody className="p-0 overflow-y-auto">
                            {renewalStep === "contacts" && (
                                <RenewalContactsStep
                                    onNext={({ newCustomerDocumentId }) => {
                                        setRenewalNewCustomerDocumentId(newCustomerDocumentId);
                                        setRenewalStep("cost");
                                    }}
                                />
                            )}
                            {renewalStep === "cost" && (
                                <RenewalCostStep
                                    onNext={({ typedSum }) => {
                                        setRenewalTypedSum(typedSum);
                                        setRenewalStep("sign");
                                    }}
                                />
                            )}
                            {renewalStep === "sign" && data && renewalNewCustomerDocumentId && (
                                <RenewalSignStep
                                    dealDocumentId={dealDocumentId}
                                    data={data}
                                    newCustomerDocumentId={renewalNewCustomerDocumentId}
                                    typedSum={renewalTypedSum}
                                    planImage={planImage}
                                    onComplete={() => { exitRenewal(); onUpdated?.(); onClose(); }}
                                />
                            )}
                        </DrawerBody>
                    </>
                ) : terminationActive ? (
                    <>
                        <DrawerHeader className="flex items-start justify-between gap-[32px] self-stretch text-[#122C5E] text-[32px] not-italic font-normal leading-[100%] bg-white p-0">
                            <div className="flex flex-col items-start gap-[16px] self-stretch flex-1 min-w-0">
                                <div className="flex justify-between items-center self-stretch gap-4">
                                    <span className="truncate">Подписать договор расторжения</span>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        isIconOnly
                                        onPress={exitTermination}
                                        aria-label="Закрыть"
                                        className="text-[#122C5E] shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </DrawerHeader>
                        <DrawerBody className="p-0 overflow-y-auto">
                            {data && (
                                <TerminationSignStep
                                    dealDocumentId={dealDocumentId}
                                    data={data}
                                    planImage={planImage}
                                    onComplete={() => { exitTermination(); onUpdated?.(); onClose(); }}
                                />
                            )}
                        </DrawerBody>
                    </>
                ) : (
                    <>
                        <DrawerHeader className="flex items-start justify-between gap-[32px] self-stretch text-[#122C5E] text-[32px] not-italic font-normal leading-[100%] bg-white p-0">
                            <div className="flex flex-col items-start gap-[16px] self-stretch flex-1 min-w-0">
                                <div className="flex justify-between items-center self-stretch gap-4">
                                    <span className="truncate">
                                        Сделка № {data ? (data.deal.id ?? data.deal.documentId) : "—"}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        isIconOnly
                                        onPress={onClose}
                                        aria-label="Закрыть"
                                        className="text-[#122C5E] shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </DrawerHeader>

                        <DrawerBody className="p-0 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center flex-1 py-12">
                                    <p className="text-[#122C5E] opacity-50">Загрузка...</p>
                                </div>
                            ) : error || !data ? (
                                <div className="flex flex-col gap-4">
                                    <p className="text-red-600 text-[14px] not-italic font-normal">{error ?? "Нет данных"}</p>
                                    <Button className="self-start" onPress={onClose}>Закрыть</Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-[32px]">
                                    {/* Секция 1: Квартира с планировкой */}
                                    <section className="flex flex-col gap-[16px] self-stretch">
                                        <div className="flex p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                                            <div className="flex w-full gap-4 items-center self-stretch">
                                                {planImage ? (
                                                    <div className="flex p-[10px] flex-col items-start gap-[10px] rounded-[16px] bg-[#FFF]">
                                                        <Image
                                                            rel="preload"
                                                            src={planImage}
                                                            alt="Планировка"
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
                                                <div className="flex flex-1 flex-col gap-6 items-start self-stretch">
                                                    <div className="flex w-full justify-between items-center self-stretch">
                                                        <h1 className="text-[#000] text-[20px] not-italic font-medium leading-[24px]">{data.deal.property?.projectName ?? "—"}</h1>
                                                        <p className="text-[#000] text-[16px] not-italic font-normal leading-[16px] opacity-30">№{data.deal.property?.apartmentNumber ?? "-"}</p>
                                                    </div>
                                                    <div className="flex w-full justify-between items-center self-stretch">
                                                        <p className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">
                                                            {isResidential
                                                                ? (Number(data.deal.property?.room ?? 0) > 0
                                                                    ? `${data.deal.property?.room} комнатная`
                                                                    : "Объект недвижимости")
                                                                : propertyTypeLabel}
                                                        </p>
                                                        <p className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.property?.totalArea ?? "—"} м²</p>
                                                    </div>
                                                    <div className="flex w-full justify-between items-center self-stretch">
                                                        <p className="text-[#2655AF] text-[16px] not-italic font-normal leading-[16px]">{formatPrice(data.deal.dealPrice)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Секция 2: Сделка */}
                                    <section className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                                        <h3 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">Сделка</h3>
                                        <div className="flex flex-col gap-[8px] text-[14px] not-italic font-normal text-[#122C5E] w-full">
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Статус:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.dealStatus}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Способ оплаты:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.paymentMethod ?? "—"}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Сумма:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPrice(data.deal.dealPrice)}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Первоначальный взнос:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatPrice(data.deal.downPayment)}</span>
                                            </div>
                                            {data.deal.expiresAt && (
                                                <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                    <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Действует до:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatDate(data.deal.expiresAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                    {/* Секция 3: Клиент */}
                                    <section className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                                        <h4 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">Клиент</h4>
                                        <div className="flex flex-col gap-[8px] text-[14px] not-italic font-normal text-[#122C5E] w-full">
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Имя:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.customer?.name ?? "—"}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Фамилия:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.customer?.surname ?? "—"}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Телефон:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.customer?.phone ?? "—"}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Email:</span> <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{data.deal.customer?.email ?? "—"}</span>
                                            </div>
                                            <div className="flex px-[0] py-[8px] justify-between items-center gap-3 self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                                                <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">Договор:</span>
                                                <div className="flex max-w-[320px] flex-col items-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color="primary"
                                                        className="shrink-0"
                                                        isLoading={agreementDownloadLoading}
                                                        isDisabled={agreementDownloadLoading}
                                                        onPress={handleDownloadAgreement}
                                                    >
                                                        {agreementFiles.length ? "Обновить договоры" : "Показать договоры"}
                                                    </Button>
                                                    {agreementFiles.map((a) => (
                                                        <a
                                                            key={a.url}
                                                            href={a.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="max-w-full truncate text-right text-xs text-[#1A3C7E] underline underline-offset-2"
                                                            title={agreementLabel(a)}
                                                        >
                                                            {agreementLabel(a)}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Секция 4: График платежей */}
                                    <section className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
                                        <h3 className="text-[#000] text-[20px] not-italic font-medium leading-[20px]">График платежей</h3>
                                        {data.paymentSchedules.length === 0 ? (
                                            <p className="text-[#122C5E] opacity-50 text-[14px]">Нет записей</p>
                                        ) : (
                                            <div className="overflow-x-auto -mx-0 w-full">
                                                <table className="w-full text-[14px] text-[#122C5E]">
                                                    <thead>
                                                        <tr className="border-b border-[#122C5E]/20 text-left">
                                                            <th className="py-2 pr-2 font-normal opacity-70">№</th>
                                                            <th className="py-2 pr-2 font-normal opacity-70">Дата</th>
                                                            <th className="py-2 font-normal opacity-70">Сумма</th>
                                                            <th className="py-2 pl-2 font-normal opacity-70">Статус</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.paymentSchedules.map((row, i) => (
                                                            <tr key={i} className="border-b border-[#122C5E]/10">
                                                                <td className="py-2 pr-2">{row.index}</td>
                                                                <td className="py-2 pr-2">{formatDate(row.dueDate)}</td>
                                                                <td className="py-2">{formatPrice(row.amount)}</td>
                                                                <td className="py-2 pl-2">{row.paymentStatus}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}
                        </DrawerBody>
                        <DrawerFooter className="flex flex-col p-2 bg-transparent">
                            <section className="flex flex-col gap-[16px] self-stretch">
                                <div className="flex flex-col gap-[10px] self-stretch">
                                    {isReserve && (
                                        <Button
                                            variant="flat"
                                            className="w-full justify-center text-white bg-[#F04800]"
                                            onPress={handleRelease}
                                            isLoading={actionLoading === "release"}
                                            isDisabled={!!actionLoading}
                                        >
                                            Отменить бронь
                                        </Button>
                                    )}
                                    {canRenewOrTerminate && (
                                        <Button
                                            variant="flat"
                                            className="w-full justify-center text-white bg-[#1A3C7E]"
                                            onPress={() => data && setRenewalStep("contacts")}
                                            isDisabled={!!actionLoading}
                                        >
                                            Переоформление
                                        </Button>
                                    )}
                                    {!isReserve && canRenewOrTerminate && (
                                        <Button
                                            color="danger"
                                            variant="bordered"
                                            className="w-full justify-center text-white bg-[#DB1D31]"
                                            onPress={() => data && setTerminationActive(true)}
                                            isDisabled={!!actionLoading}
                                        >
                                            Расторжение
                                        </Button>
                                    )}
                                    <Button variant="light" className="w-full justify-center text-[#122C5E]" onPress={onClose}>
                                        Закрыть
                                    </Button>
                                </div>
                            </section>
                        </DrawerFooter>
                    </>
                )}
            </DrawerContent>
        </Drawer>
    );
}
