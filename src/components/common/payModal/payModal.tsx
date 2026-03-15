"use client"

import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, store } from "@/store";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Button } from "@heroui/react";
import { closePay, setStep, setAgreementPayload } from "@/store/paySlice";
import { useTranslations } from "next-intl";

const PAY_DEAL_STORAGE_KEY = "payDealId";
import { Flat as FlatType, PaymentConditionForFlat } from "@/types/flat";

import FullPayment from "./full/full";
import Installment from "./installment/installment";
import Deffered from "./deffered/deffered";
import Hypothec from "./hypothec/hypothec";
import Contacts from "./contacts/contacts";
import ContractNumber from "./contractNumber/contractNumber";
import Sign from "./sign/sign";

interface PayModalProps {
    id?: string;
    paymentMethod?: string;
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

export default function PayModal({ id }: PayModalProps) {
    const t = useTranslations();
    const dispatch = useDispatch();
    const { isOpen, step, flat, paymentMethod, agreementPayload, dealDocumentId } = useSelector((state: RootState) => state.pay);
    const [isMobile, setIsMobile] = useState(false);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentConfirmLoading, setPaymentConfirmLoading] = useState(false);
    const [paymentConfirmError, setPaymentConfirmError] = useState<string | null>(null);
    const [flatData, setFlat] = useState<ComponentFlat | null>(null);
    const stepsOrder = ['payment', 'contacts', 'contractNumber', 'sign'];
    const currentIndex = stepsOrder.indexOf(step);

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
        fetch(`/api/properties/${idStr}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: PropertyDetailApi | null) => {
                if (!cancelled && data?.id != null) setFlat(adaptPropertyToComponentFlat(data));
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, id, flat]);

    useEffect(() => {
        if (isOpen && dealDocumentId) {
            sessionStorage.setItem(PAY_DEAL_STORAGE_KEY, dealDocumentId);
        }
    }, [isOpen, dealDocumentId]);

    // При закрытии модалки/обновлении страницы вызываем release. Бэкенд не отменяет сделку, если статус «Ожидания договора»/«Договор подписан»/«Оплачено». Если сделку не отменили — не чистим sessionStorage, чтобы после возврата на квартиру можно было продолжить подписание.
    useEffect(() => {
        if (!isOpen && typeof sessionStorage !== "undefined") {
            const savedId = sessionStorage.getItem(PAY_DEAL_STORAGE_KEY);
            if (savedId) {
                fetch(`/api/deals/${savedId}/release`, { method: "POST", credentials: "include" })
                    .then((r) => r.json().catch(() => ({})))
                    .then((data: { released?: boolean }) => {
                        if (data?.released === true) sessionStorage.removeItem(PAY_DEAL_STORAGE_KEY);
                    })
                    .catch(() => {});
            }
        }
    }, [isOpen]);

    // Бронь 2 часа — подставляем для отображения в шаге оплаты
    useEffect(() => {
        if (isOpen) setActiveOption("2h");
    }, [isOpen]);
    // Шаг бронирования не показываем — сразу оплата
    useEffect(() => {
        if (step === "reserve") dispatch(setStep("payment"));
    }, [step, dispatch]);


    const Steps = () => {

        const handlePaymentNext = async (payload?: import("@/types/agreement").AgreementPayload) => {
            if (payload && dealDocumentId) {
                setPaymentConfirmError(null);
                setPaymentConfirmLoading(true);
                try {
                    const res = await fetch(`/api/deals/${dealDocumentId}/confirm-payment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ agreementPayload: payload }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        setPaymentConfirmError(data?.error ?? t("failed_to_save_payment_conditions"));
                        setPaymentConfirmLoading(false);
                        return;
                    }
                } catch {
                    setPaymentConfirmError(t("network_error"));
                    setPaymentConfirmLoading(false);
                    return;
                }
                setPaymentConfirmLoading(false);
            }
            if (payload) dispatch(setAgreementPayload(payload));
            dispatch(setStep("contacts"));
        };
        const paymentComponents = {
            full: (
                <div className="flex flex-col gap-4 self-stretch">
                    <FullPayment
                        flatData={flatData}
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
                        activeButton={activeOption}
                        onNext={handlePaymentNext}
                        isSubmitting={paymentConfirmLoading}
                    />
                    {paymentConfirmError && (
                        <p className="text-red-600 text-[14px] not-italic font-normal">{paymentConfirmError}</p>
                    )}
                </div>
            ),
            hypothec: <Hypothec />
        };

        type PaymentMethod = keyof typeof paymentComponents;

        const stepsMap = {
            payment: paymentMethod && paymentMethod in paymentComponents
                ? paymentComponents[paymentMethod as PaymentMethod]
                : null,

            contacts: (
                <Contacts
                    flatData={flatData}
                    agreementPayload={agreementPayload}
                    dealDocumentId={dealDocumentId}
                    onNext={() => dispatch(setStep("contractNumber"))}
                />
            ),

            contractNumber: (
                <ContractNumber
                    flatData={flatData}
                    agreementPayload={agreementPayload}
                    dealDocumentId={dealDocumentId}
                    onNext={() => dispatch(setStep("sign"))}
                />
            ),

            sign: (
                <Sign
                    flatData={flatData}
                    agreementPayload={agreementPayload}
                    activeButton={activeOption}
                    onNext={() => dispatch(closePay())}
                />
            ),
        };

        const stepKey = step === "reserve" ? "payment" : step;
        return stepsMap[stepKey as keyof typeof stepsMap] ?? null;
    };

    const handleCloseDrawer = () => {
        const dealId = store.getState().pay.dealDocumentId;
        if (dealId) {
            fetch(`/api/deals/${dealId}/release`, { method: "POST", credentials: "include" })
                .then((r) => r.json().catch(() => ({})))
                .then((data: { released?: boolean }) => {
                    if (data?.released === true && typeof sessionStorage !== "undefined")
                        sessionStorage.removeItem(PAY_DEAL_STORAGE_KEY);
                })
                .catch(() => {});
        }
        dispatch(closePay());
    };

    const showCloseButton = step !== "sign";
    const canGoBack = step === "contacts" || step === "contractNumber";
    const handleGoBack = () => {
        if (step === "contacts") {
            dispatch(setStep("payment"));
        } else if (step === "contractNumber") {
            dispatch(setStep("contacts"));
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
                    const dealId = store.getState().pay.dealDocumentId;
                    if (dealId) {
                        fetch(`/api/deals/${dealId}/release`, { method: "POST", credentials: "include" })
                            .then((r) => r.json().catch(() => ({})))
                            .then((data: { released?: boolean }) => {
                                if (data?.released === true && typeof sessionStorage !== "undefined")
                                    sessionStorage.removeItem(PAY_DEAL_STORAGE_KEY);
                            })
                            .catch(() => {});
                    }
                    dispatch(closePay());
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
                                        {step === "payment" && paymentMethod === "full" && t("full_payment")}
                                        {step === "payment" && paymentMethod === "installment" && t("installment")}
                                        {step === "payment" && paymentMethod === "deffered" && t("deffered")}
                                        {step === "payment" && paymentMethod === "hypothec" && t("hypothec")}
                                        {step === "contacts" && t("personal_information")}
                                        {step === "contractNumber" && t("contract_number")}
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