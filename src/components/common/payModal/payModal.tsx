"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, store } from "@/store";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Button } from "@heroui/react";
import { closePay, setStep, setAgreementPayload, setBaseContractType } from "@/store/paySlice";
import { useTranslations } from "next-intl";

const PAY_DEAL_STORAGE_KEY = "payDealId";
const PAY_DEAL_CONTEXT_STORAGE_KEY = "payDealContext";
import { Flat as FlatType, PaymentConditionForFlat } from "@/types/flat";

import FullPayment from "./full/full";
import Installment from "./installment/installment";
import Deffered from "./deffered/deffered";
import Hypothec from "./hypothec/hypothec";
import Contacts from "./contacts/contacts";
import Sign from "./sign/sign";
import type { RealEstateType } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";

function agreementTypeForRealEstate(rt: RealEstateType): string {
    if (rt === "commerce") return "Коммерция";
    if (rt === "parking") return "Паркинг";
    if (rt === "pantry") return "Кладовка";
    return "Квартиры";
}

function normalizeBaseContractTypeLabel(raw: string): "ДДУ" | "ПДБ" | null {
    const s = String(raw ?? "").trim();
    if (s === "ПДБ") return "ПДБ";
    if (s === "ДДУ") return "ДДУ";
    return null;
}

function normalizeAgreementPayloadForConfirm(payload: AgreementPayload): AgreementPayload {
    return {
        ...payload,
        paymentSchedule: (payload.paymentSchedule || []).map((row) => ({
            ...row,
            sum: String(parseInt(String(row?.sum ?? "").replace(/\D/g, ""), 10) || 0),
        })),
    };
}

interface PayModalProps {
    id?: string;
    paymentMethod?: string;
    realEstateType?: RealEstateType;
}

interface ComponentFlat {
    id: number;
    documentId?: string;
    title: string;
    address: string;
    price: string;
    originalPrice?: string;
    priceM2: string;
    tags: string[];
    images: string[];
    room: string;
    area: string;
    floor: string;
    section: string;
    entrance: string;
    available: string;
    apartmentNumber: number;
    house: number;
    complexDueDate: string;
    /** Discount amount in ₸ (e.g. 351000). When set, price is already discounted. */
    fullPaymentDiscount?: number;
    /** Discount as % (e.g. 3 for -3%) when fullPaymentDiscount is set */
    discountPercent?: number;
    paymentConditions?: PaymentConditionForFlat[];
    /** Полная цена без скидки за 100% (для рассрочки/отложенного не применяется скидка) */
    fullPriceBeforeDiscount?: number;
    /** Площадь в м² (для расчёта стоимости с надбавкой за м²) */
    totalArea?: number;
    /** Project documentId for promocode validation */
    projectDocumentId?: string;
    /** Солнечность (для фильтра промокода) */
    sunshine?: string;
    planView?: string;
    floorGroup?: string;
    loggiaView?: string;
    location?: string;
    riseRow?: number;
    windowView?: string;
    /** Plan image URL for agreement (e.g. platform plan or first plan image) */
    plan?: string;
}

/** Формат ответа GET /api/properties/[id] — поля могут отсутствовать после изменений в Strapi */
interface PropertyDetailApi {
    id?: number;
    documentId?: string | number;
    projectName?: string;
    projectDocumentId?: string;
    complexAddress?: string;
    district?: string;
    priceCheckmate?: number;
    priceM2Checkmate?: number;
    fullPaymentDiscount?: number;
    room?: number;
    totalArea?: number;
    floor?: number;
    section?: string;
    entrance?: number;
    propertyStatus?: string;
    images?: string[];
    platformPlanImages?: string[];
    tags?: string[];
    complexDueDate?: string;
    complexClass?: string;
    complexGenPlanImage?: string;
    sunshine?: string;
    apartmentNumber?: number;
    house?: number;
    paymentConditions?: PaymentConditionForFlat[];
    planView?: string;
    floorGroup?: string;
    loggiaView?: string;
    location?: string;
    riseRow?: number;
    windowView?: string;
}

function adaptPropertyToComponentFlat(api: PropertyDetailApi): ComponentFlat {
    const address = api.complexAddress || [api.district, api.projectName].filter(Boolean).join(", ") || "";
    const basePrice = api.priceCheckmate ?? 0;
    const discountAmount = (api.fullPaymentDiscount != null && api.fullPaymentDiscount > 0) ? api.fullPaymentDiscount : 0;
    const displayPrice = discountAmount > 0 ? Math.max(0, basePrice - discountAmount) : basePrice;
    const price = `${displayPrice.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`;
    const originalPrice = discountAmount > 0 ? `${basePrice.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸` : undefined;
    const discountPercent = discountAmount > 0 && basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : undefined;
    const priceM2 = `${(api.priceM2Checkmate ?? 0).toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`;
    const images = [...(api.images ?? []), ...(api.platformPlanImages ?? [])];
    return {
        id: api.id ?? 0,
        documentId: api.documentId != null ? String(api.documentId) : undefined,
        title: api.projectName ?? "",
        address,
        price,
        originalPrice,
        priceM2,
        tags: api.tags ?? [],
        images,
        room: String(api.room ?? "0"),
        area: `${api.totalArea ?? 0} м²`,
        floor: String(api.floor ?? "0"),
        section: String(api.section ?? "0"),
        entrance: String(api.entrance ?? "0"),
        available: api.propertyStatus ?? "свободно",
        apartmentNumber: api.apartmentNumber ?? 0,
        house: api.house ?? 0,
        complexDueDate: api.complexDueDate || "",
        fullPaymentDiscount: discountAmount > 0 ? discountAmount : undefined,
        discountPercent,
        paymentConditions: api.paymentConditions,
        fullPriceBeforeDiscount: api.priceCheckmate ?? undefined,
        totalArea: api.totalArea ?? undefined,
        projectDocumentId: api.projectDocumentId,
        sunshine: api.sunshine,
        planView: api.planView,
        floorGroup: api.floorGroup,
        loggiaView: api.loggiaView,
        location: api.location,
        riseRow: api.riseRow,
        windowView: api.windowView,
        plan: api.images?.[0] ?? api.platformPlanImages?.[0] ?? api.complexGenPlanImage,
    };
}

const adaptFlat = (flat: FlatType): ComponentFlat => {
    let tags: string[] = [];
    if (typeof flat.tags === 'string') {
        tags = flat.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } else if (typeof flat.tags === 'number') {
        tags = [flat.tags.toString()];
    }

    let images: string[] = [];
    if (typeof flat.img === 'string') {
        images = flat.img.split(',').map(img => img.trim()).filter(img => img.length > 0);
    } else if (typeof flat.img === 'number') {
        images = [flat.img.toString()];
    }

    const formattedPrice =
        typeof flat.price === "number"
            ? `${flat.price.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸`
            : `${flat.price} ₸`;

    const formattedPriceM2 =
        typeof flat.priceM2 === "number"
            ? `${flat.priceM2.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} ₸/м²`
            : `${flat.priceM2} ₸/м²`;

    return {
        id: flat.id,
        documentId: flat.documentId,
        title: flat.title,
        address: flat.address,
        price: formattedPrice,
        priceM2: formattedPriceM2,
        tags: tags,
        images: images,
        room: flat.room.toString(),
        area: `${flat.area} м²`,
        floor: flat.floor.toString(),
        section: flat.section != null ? String(flat.section) : "0",
        entrance: flat.entrance.toString(),
        available: flat.available.toString(),
        apartmentNumber: flat.apartmentNumber || 0,
        house: flat.house || 0,
        complexDueDate: flat.complexDueDate || "",
        fullPaymentDiscount: flat.fullPaymentDiscount,
        discountPercent: flat.discountPercent,
        originalPrice: flat.originalPrice,
        paymentConditions: flat.paymentConditions,
        fullPriceBeforeDiscount:
            flat.fullPriceBeforeDiscount != null && flat.fullPriceBeforeDiscount > 0
                ? flat.fullPriceBeforeDiscount
                : typeof flat.price === "number"
                    ? flat.price + (flat.fullPaymentDiscount ?? 0)
                    : undefined,
        totalArea: (flat as { totalArea?: number }).totalArea ?? (typeof flat.area === "number" ? flat.area : undefined),
        projectDocumentId: flat.projectDocumentId,
        floorGroup: (flat as { floorGroup?: string }).floorGroup,
    };
};

export default function PayModal({ id, realEstateType = "property" }: PayModalProps) {
    const t = useTranslations();
    const dispatch = useDispatch();
    const { isOpen, step, flat, paymentMethod, agreementPayload, dealDocumentId, baseContractType } = useSelector((state: RootState) => state.pay);
    const [isMobile, setIsMobile] = useState(false);
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentConfirmLoading, setPaymentConfirmLoading] = useState(false);
    const [paymentConfirmError, setPaymentConfirmError] = useState<string | null>(null);
    const [flatData, setFlat] = useState<ComponentFlat | null>(null);
    const [availableBaseContractTypes, setAvailableBaseContractTypes] = useState<("ДДУ" | "ПДБ")[]>(["ДДУ", "ПДБ"]);
    const [scenarioTypesLoading, setScenarioTypesLoading] = useState(false);
    const stepsOrder = ['payment', 'scenario', 'contacts', 'approval', 'sign'];
    const currentIndex = stepsOrder.indexOf(step);
    const pendingCloseReasonRef = useRef<"user" | "success" | null>(null);
    const wasOpenRef = useRef(false);
    const completedDealIdRef = useRef<string | null>(null);

    const currentDealContext = useMemo(() => {
        const idStr = dealDocumentId ? String(dealDocumentId) : null;
        const entityId =
            flatData?.documentId != null
                ? String(flatData.documentId)
                : flat?.documentId != null
                    ? String(flat.documentId)
                    : id != null
                        ? String(Array.isArray(id) ? id[0] : id)
                        : null;
        return idStr ? { dealDocumentId: idStr, entityDocumentId: entityId, realEstateType } : null;
    }, [dealDocumentId, flatData?.documentId, flat?.documentId, id, realEstateType]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // When modal opens with flat from Redux: use it (no duplicate fetch from detail page).
    // If we have id and Redux flat matches that id, use Redux flat; otherwise fetch by id when needed.
    useEffect(() => {
        if (!isOpen) return;
        const idStr = id ? (Array.isArray(id) ? id[0] : id) : null;
        if (flat && (!idStr || String(flat.documentId) === String(idStr))) {
            setFlat(adaptFlat(flat));
            return;
        }
        if (!idStr) return;
        let cancelled = false;
        setLoading(true);
        fetch(`/api/properties/${idStr}?type=${encodeURIComponent(realEstateType)}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: PropertyDetailApi | null) => {
                if (!cancelled && data?.id != null) setFlat(adaptPropertyToComponentFlat(data));
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, id, flat, realEstateType]);

    useEffect(() => {
        if (!isOpen) return;
        if (typeof sessionStorage === "undefined") return;
        if (!dealDocumentId) return;

        sessionStorage.setItem(PAY_DEAL_STORAGE_KEY, String(dealDocumentId)); // backward-compat
        if (currentDealContext) {
            sessionStorage.setItem(PAY_DEAL_CONTEXT_STORAGE_KEY, JSON.stringify(currentDealContext));
        }
    }, [isOpen, dealDocumentId, currentDealContext]);

    const requestClose = (reason: "user" | "success") => {
        pendingCloseReasonRef.current = reason;
        if (reason === "success") {
            completedDealIdRef.current = dealDocumentId ? String(dealDocumentId) : completedDealIdRef.current;
        } else {
            completedDealIdRef.current = null;
        }
        dispatch(closePay());
    };

    // При закрытии модалки/обновлении страницы вызываем release, но НЕ при успешном завершении.
    // Если сделку не отменили — не чистим sessionStorage, чтобы после возврата на квартиру можно было продолжить подписание.
    useEffect(() => {
        const wasOpen = wasOpenRef.current;
        wasOpenRef.current = isOpen;
        if (!wasOpen || isOpen) return;

        if (typeof sessionStorage === "undefined") return;
        const reason = pendingCloseReasonRef.current ?? "user";
        pendingCloseReasonRef.current = null;

        if (reason === "success") {
            sessionStorage.removeItem(PAY_DEAL_STORAGE_KEY);
            sessionStorage.removeItem(PAY_DEAL_CONTEXT_STORAGE_KEY);
            return;
        }

        const savedId =
            (() => {
                try {
                    const raw = sessionStorage.getItem(PAY_DEAL_CONTEXT_STORAGE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed?.dealDocumentId) return String(parsed.dealDocumentId);
                    }
                } catch { }
                return sessionStorage.getItem(PAY_DEAL_STORAGE_KEY);
            })();
        if (!savedId) return;

        fetch(`/api/deals/${savedId}/release`, { method: "POST", credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((data: { released?: boolean }) => {
                if (data?.released === true) {
                    sessionStorage.removeItem(PAY_DEAL_STORAGE_KEY);
                    sessionStorage.removeItem(PAY_DEAL_CONTEXT_STORAGE_KEY);
                }
            })
            .catch(() => {});
    }, [isOpen]);

    // Best-effort release on tab close / reload while pay modal is open.
    // Uses keepalive to increase chances the request is sent.
    useEffect(() => {
        if (!isOpen) return;
        if (!dealDocumentId) return;

        const dealId = String(dealDocumentId);
        const onPageHide = () => {
            // If we already completed successfully in this session, never release.
            if (pendingCloseReasonRef.current === "success") return;
            if (completedDealIdRef.current && completedDealIdRef.current === dealId) return;
            try {
                fetch(`/api/deals/${encodeURIComponent(dealId)}/release`, {
                    method: "POST",
                    credentials: "include",
                    keepalive: true,
                }).catch(() => { });
            } catch { }
        };

        window.addEventListener("pagehide", onPageHide);
        return () => window.removeEventListener("pagehide", onPageHide);
    }, [isOpen, dealDocumentId]);

    // Бронь 2 часа — подставляем для отображения в шаге оплаты
    useEffect(() => {
        if (isOpen) setActiveOption("2h");
    }, [isOpen]);
    // Шаг бронирования не показываем — сразу этап условий оплаты
    useEffect(() => {
        if (step === "reserve") dispatch(setStep("payment"));
    }, [step, dispatch]);

    useEffect(() => {
        if (!isOpen || step !== "scenario") return;
        const pid = flatData?.projectDocumentId;
        if (!pid) return;
        let cancelled = false;
        setScenarioTypesLoading(true);
        fetch(
            `/api/signed-agreements/available-base-contract-types?projectDocumentId=${encodeURIComponent(pid)}&agreementType=${encodeURIComponent(agreementTypeForRealEstate(realEstateType))}`,
            { credentials: "include" }
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { baseContractTypes?: unknown[] } | null) => {
                if (cancelled || !data) return;
                const raw = Array.isArray(data.baseContractTypes) ? data.baseContractTypes : [];
                const norm: ("ДДУ" | "ПДБ")[] = [];
                for (const x of raw) {
                    const n = normalizeBaseContractTypeLabel(String(x));
                    if (n && !norm.includes(n)) norm.push(n);
                }
                setAvailableBaseContractTypes(norm.length > 0 ? norm : ["ДДУ", "ПДБ"]);
            })
            .catch(() => {
                if (!cancelled) setAvailableBaseContractTypes(["ДДУ", "ПДБ"]);
            })
            .finally(() => {
                if (!cancelled) setScenarioTypesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, step, flatData?.projectDocumentId, realEstateType]);

    useEffect(() => {
        if (!isOpen || step !== "scenario") return;
        if (availableBaseContractTypes.length !== 1) return;
        const only = availableBaseContractTypes[0];
        if (baseContractType !== only) dispatch(setBaseContractType(only));
    }, [isOpen, step, availableBaseContractTypes, baseContractType, dispatch]);

    useEffect(() => {
        if (step !== "scenario" || availableBaseContractTypes.length === 0) return;
        if (baseContractType && !availableBaseContractTypes.includes(baseContractType)) {
            dispatch(setBaseContractType(null));
        }
    }, [step, baseContractType, availableBaseContractTypes, dispatch]);


    const Steps = () => {

        const handlePaymentNext = async (payload?: import("@/types/agreement").AgreementPayload) => {
            if (payload && dealDocumentId) {
                const confirmPayload = normalizeAgreementPayloadForConfirm(payload);
                setPaymentConfirmError(null);
                setPaymentConfirmLoading(true);
                try {
                    const confirmRes = await fetch(`/api/deals/${dealDocumentId}/confirm-payment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ agreementPayload: confirmPayload }),
                    });
                    if (!confirmRes.ok) {
                        const fixRes = await fetch(`/api/deals/${dealDocumentId}/fix-schedule`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                paymentSchedule: confirmPayload.paymentSchedule,
                                paymentMethod: confirmPayload.paymentMethod,
                                totalSum: confirmPayload.totalSum,
                            }),
                        });
                        const fixData = await fixRes.json().catch(() => ({}));
                        if (!fixRes.ok) {
                            setPaymentConfirmError(fixData?.error ?? t("failed_to_save_payment_conditions"));
                            setPaymentConfirmLoading(false);
                            return;
                        }
                    }
                } catch {
                    setPaymentConfirmError(t("network_error"));
                    setPaymentConfirmLoading(false);
                    return;
                }
                setPaymentConfirmLoading(false);
            }
            if (payload) dispatch(setAgreementPayload(payload));
            dispatch(setStep("scenario"));
        };

        const handleScenarioNext = async () => {
            if (!baseContractType) return;
            if (dealDocumentId) {
                try {
                    await fetch(`/api/deals/${dealDocumentId}/base-contract-type`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ baseContractType }),
                    });
                } catch {
                    // non-blocking: generation has backend fallback to default
                }
            }
            dispatch(setStep("contacts"));
        };

        const ApprovalStep = () => {
            const [requesting, setRequesting] = useState(false);
            const [checking, setChecking] = useState(false);
            const [requested, setRequested] = useState(false);
            const [statusText, setStatusText] = useState<string | null>(null);
            const [dealStatus, setDealStatus] = useState<string>("");
            const [approvalError, setApprovalError] = useState<string | null>(null);

            const statusStyle = useMemo(() => {
                const s = dealStatus.trim();
                if (s === "Согласование РОП") return "bg-emerald-100 text-emerald-800 border-emerald-300";
                if (s === "Ожидания договора") return "bg-violet-100 text-violet-800 border-violet-300";
                if (s === "Договор подписан") return "bg-green-100 text-green-800 border-green-300";
                if (s === "Отменен") return "bg-red-100 text-red-800 border-red-300";
                return "bg-slate-100 text-slate-700 border-slate-300";
            }, [dealStatus]);

            const loadStatus = useCallback(async () => {
                if (!dealDocumentId) return;
                const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/summary`, { credentials: "include" });
                const json = await res.json().catch(() => ({}));
                const status = String(json?.dealStatus ?? "").trim();
                setDealStatus(status);
                if (status === "Согласование РОП") {
                    setRequested(true);
                    setStatusText("Сделка отправлена на согласование РОП");
                } else if (status === "Ожидания договора" || status === "Договор подписан") {
                    dispatch(setStep("sign"));
                    return;
                } else {
                    setStatusText(status ? `Текущий статус: ${status}` : null);
                }
            }, [dealDocumentId]);

            useEffect(() => {
                loadStatus().catch(() => {
                    // ignore initial status errors
                });
            }, [loadStatus]);

            const handleRequestApproval = async () => {
                if (!dealDocumentId || requesting) return;
                setApprovalError(null);
                setRequesting(true);
                try {
                    const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/approval`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ action: "request" }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        setApprovalError(json?.error ?? "Не удалось отправить сделку на согласование РОП");
                        return;
                    }
                    setRequested(true);
                    setStatusText("Сделка отправлена на согласование РОП");
                } catch {
                    setApprovalError(t("network_error"));
                } finally {
                    setRequesting(false);
                }
            };

            const handleCheckApproval = async () => {
                if (!dealDocumentId || checking) return;
                setChecking(true);
                setApprovalError(null);
                try {
                    await loadStatus();
                } catch {
                    setApprovalError(t("network_error"));
                } finally {
                    setChecking(false);
                }
            };

            return (
                <div className="flex flex-col gap-4 self-stretch">
                    <p className="text-[#122C5E] text-[16px] opacity-70">
                        Перед подписанием договора отправьте сделку на согласование РОП.
                    </p>
                    {dealStatus && (
                        <div className="flex items-center gap-2">
                            <span className="text-[#122C5E] text-[14px]">Статус сделки:</span>
                            <span className={`rounded-full border px-3 py-1 text-[13px] font-medium ${statusStyle}`}>
                                {dealStatus}
                            </span>
                        </div>
                    )}
                    {statusText && (
                        <p className="text-[#2655AF] text-[14px]">{statusText}</p>
                    )}
                    {approvalError && (
                        <p className="text-red-600 text-[14px]">{approvalError}</p>
                    )}
                    <Button
                        onPress={handleRequestApproval}
                        isLoading={requesting}
                        isDisabled={!dealDocumentId || requesting || requested}
                        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
                    >
                        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
                            {requested ? "Отправлено на согласование" : "Отправить на согласование РОП"}
                        </span>
                    </Button>
                    <Button
                        onPress={handleCheckApproval}
                        isLoading={checking}
                        isDisabled={!dealDocumentId || checking}
                        variant="bordered"
                        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] border-[#1A3C7E] text-[#1A3C7E]"
                    >
                        <span className="text-[15px] not-italic font-medium leading-[20px]">
                            Проверить согласование
                        </span>
                    </Button>
                </div>
            );
        };
        const paymentComponents = {
            full: (
                <div className="flex flex-col gap-4 self-stretch">
                    <FullPayment
                        flatData={flatData}
                        realEstateType={realEstateType}
                        activeButton={activeOption}
                        onNext={handlePaymentNext}
                        isSubmitting={paymentConfirmLoading}
                    />
                    {paymentConfirmError && (
                        <p className="text-red-600 text-[14px] not-italic font-normal">{paymentConfirmError}</p>
                    )}
                </div>
            ),
            installment: (
                <div className="flex flex-col gap-4 self-stretch">
                    <Installment
                        flatData={flatData}
                        realEstateType={realEstateType}
                        activeButton={activeOption}
                        onNext={handlePaymentNext}
                        isSubmitting={paymentConfirmLoading}
                    />
                    {paymentConfirmError && (
                        <p className="text-red-600 text-[14px] not-italic font-normal">{paymentConfirmError}</p>
                    )}
                </div>
            ),
            deffered: (
                <div className="flex flex-col gap-4 self-stretch">
                    <Deffered
                        flatData={flatData}
                        realEstateType={realEstateType}
                        activeButton={activeOption}
                        onNext={handlePaymentNext}
                        isSubmitting={paymentConfirmLoading}
                    />
                    {paymentConfirmError && (
                        <p className="text-red-600 text-[14px] not-italic font-normal">{paymentConfirmError}</p>
                    )}
                </div>
            ),
            hypothec: (
                <div className="flex flex-col gap-4 self-stretch">
                    <Hypothec
                        flatData={flatData}
                        realEstateType={realEstateType}
                        activeButton={activeOption}
                        onNext={handlePaymentNext}
                        isSubmitting={paymentConfirmLoading}
                    />
                    {paymentConfirmError && (
                        <p className="text-red-600 text-[14px] not-italic font-normal">{paymentConfirmError}</p>
                    )}
                </div>
            )
        };

        type PaymentMethod = keyof typeof paymentComponents;

        const stepsMap = {
            scenario: (
                <div className="flex flex-col gap-4 self-stretch">
                    <p className="text-[#1A3C7E] text-[14px] font-normal opacity-70">Выберите сценарий сделки</p>
                    {scenarioTypesLoading ? (
                        <p className="text-[#7E7E7E] text-[14px]">{t("loading")}</p>
                    ) : (
                        <div className="flex items-start gap-[8px]">
                            {availableBaseContractTypes.includes("ДДУ") && (
                                <button
                                    type="button"
                                    onClick={() => dispatch(setBaseContractType("ДДУ"))}
                                    className={`flex items-center justify-center h-[64px] w-full px-[10px] py-[4px] rounded-[24px] text-[16px] leading-[24px] font-normal transition-colors ${baseContractType === "ДДУ" ? "bg-[#2655AF] text-white" : "bg-[#F4F6FB] text-[#2655AF]"}`}
                                >
                                    ДДУ
                                </button>
                            )}
                            {availableBaseContractTypes.includes("ПДБ") && (
                                <button
                                    type="button"
                                    onClick={() => dispatch(setBaseContractType("ПДБ"))}
                                    className={`flex items-center justify-center h-[64px] w-full px-[10px] py-[4px] rounded-[24px] text-[16px] leading-[24px] font-normal transition-colors ${baseContractType === "ПДБ" ? "bg-[#2655AF] text-white" : "bg-[#F4F6FB] text-[#2655AF]"}`}
                                >
                                    ПДБ
                                </button>
                            )}
                        </div>
                    )}
                    <Button
                        onPress={handleScenarioNext}
                        isDisabled={!baseContractType || scenarioTypesLoading || availableBaseContractTypes.length === 0}
                        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
                    >
                        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{t("next")}</span>
                    </Button>
                </div>
            ),
            payment: paymentMethod && paymentMethod in paymentComponents
                ? paymentComponents[paymentMethod as PaymentMethod]
                : null,

            contacts: (
                <Contacts
                    flatData={flatData}
                    agreementPayload={agreementPayload}
                    dealDocumentId={dealDocumentId}
                    onNext={() => dispatch(setStep("approval"))}
                />
            ),
            approval: <ApprovalStep />,

            sign: (
                <Sign
                    flatData={flatData}
                    agreementPayload={agreementPayload}
                    realEstateType={realEstateType}
                    onNext={() => requestClose("success")}
                />
            ),
        };

        const stepKey = step === "reserve" ? "payment" : step;
        return stepsMap[stepKey as keyof typeof stepsMap] ?? null;
    };

    const handleCloseDrawer = () => requestClose("user");

    const showCloseButton = step !== "sign";
    const canGoBack = step === "contacts" || step === "scenario" || step === "approval";
    const handleGoBack = () => {
        if (step === "approval") {
            dispatch(setStep("contacts"));
            return;
        }
        if (step === "contacts") {
            dispatch(setStep("scenario"));
            return;
        }
        if (step === "scenario") {
            dispatch(setStep("payment"));
        }
    };

    return (
        <Drawer
            isDismissable={false}
            hideCloseButton
            isKeyboardDismissDisabled
            classNames={{ base: "fixed flex w-full max-w-[600px] min-h-[75vh] bottom-0 h-full px-[16px] py-[24px] lg:px-[40px] lg:py-[64px] flex-col gap-[10px] rounded-t-[32px] bg-[#FFF]" }}
            placement={isMobile ? "bottom" : "right"}
            isOpen={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    requestClose("user");
                }
            }}
        >
            <DrawerContent className="flex flex-col gap-[32px] h-full self-stretch">
                {(() => (
                    <>
                        {paymentMethod !== "hypothec" && (
                            <div className="self-stretch h-4 inline-flex justify-start items-center gap-6">
                                {stepsOrder.map((s, index) => (
                                    <div
                                        key={s}
                                        className={`flex-1 h-0 outline outline-[3px] outline-offset-[-1.50px] outline-blue-800 ${index <= currentIndex ? '' : 'opacity-20'
                                            }`}
                                    ></div>
                                ))}
                            </div>
                        )}

                        <DrawerHeader className="flex items-start justify-between gap-[32px] self-stretch text-[#122C5E] text-[32px] not-italic font-normal leading-[100%] bg-white p-0">
                            <div className="flex flex-col items-start gap-[16px] self-stretch flex-1 min-w-0">
                                <div className="flex justify-between items-center self-stretch gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {canGoBack && (
                                            <Button
                                                isIconOnly
                                                variant="light"
                                                size="sm"
                                                aria-label={t("back")}
                                                className="shrink-0 text-[#122C5E] min-w-8 w-8 h-8"
                                                onPress={handleGoBack}
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
                                        {step === "scenario" && "Сценарий сделки"}
                                        {step === "payment" && paymentMethod === "full" && t("full_payment")}
                                        {step === "payment" && paymentMethod === "installment" && t("installment")}
                                        {step === "payment" && paymentMethod === "deffered" && t("deffered")}
                                        {step === "payment" && paymentMethod === "hypothec" && t("hypothec")}
                                        {step === "contacts" && t("personal_information")}
                                        {step === "approval" && "Согласование РОП"}
                                        {step === "sign" && t("sign_contract")}
                                        </span>
                                    </div>
                                    {showCloseButton && (
                                        <Button
                                            isIconOnly
                                            variant="light"
                                            size="sm"
                                            aria-label={t("close")}
                                            className="shrink-0 text-[#122C5E] min-w-8 w-8 h-8"
                                            onPress={handleCloseDrawer}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </Button>
                                    )}
                                </div>
                                {step === "payment" && (
                                    <div className="flex items-center gap-[4px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M14.6673 8.0026C14.6673 11.6845 11.6825 14.6693 8.00065 14.6693C4.31875 14.6693 1.33398 11.6845 1.33398 8.0026C1.33398 4.32071 4.31875 1.33594 8.00065 1.33594C11.6825 1.33594 14.6673 4.32071 14.6673 8.0026Z" fill="#2655AF" />
                                            <path fillRule="evenodd" clipRule="evenodd" d="M8.00065 4.83594C8.27679 4.83594 8.50065 5.05979 8.50065 5.33594V7.7955L10.0209 9.31572C10.2161 9.51098 10.2161 9.82756 10.0209 10.0228C9.82561 10.2181 9.50903 10.2181 9.31376 10.0228L7.6471 8.35616C7.55333 8.26239 7.50065 8.13521 7.50065 8.0026V5.33594C7.50065 5.05979 7.72451 4.83594 8.00065 4.83594Z" fill="white" />
                                        </svg>
                                        <div className="self-stretch opacity-50 justify-center text-blue-950 text-base font-normal leading-4">
                                            {t("reservation_time_description")}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DrawerHeader>
                        <DrawerBody className="p-0">
                            <Steps />
                        </DrawerBody>
                    </>
                ))()}
            </DrawerContent>
        </Drawer>
    );
}