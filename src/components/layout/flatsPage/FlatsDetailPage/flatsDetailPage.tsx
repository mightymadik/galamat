"use client"

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@heroui/button"
import Image from "next/image"
import { Flat as FlatType, PaymentConditionForFlat } from "@/types/flat";
import { notFound, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { openPay } from "@/store/paySlice";
import { openAuth } from "@/store/authSlice";
import { toggleFavorite } from "@/store/favoritesSlice";
import { useTranslations } from "next-intl";
import LeaveRequestDrawer from "../../../common/leaverRequestDrawer/leaveRequestDrawer";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
    parseDownPaymentPercent,
    isPaymentConditionValidToday,
    isPaymentMethod,
    isActivePaymentStatus,
    formatPriceDisplay,
    formatComplexDueDate,
    getInstallmentPreview,
    getDefferedPreview,
    getFullPaymentDiscountFromConditions,
    parsePriceString,
    parseRaise,
} from "@/lib/paymentFormUtils";

interface FlatDetail {
    id: number;
    documentId: string;
    title: string;
    address: string;
    price: string;
    /** When fullPaymentDiscount is set, original price to show crossed out */
    originalPrice?: string;
    /** Discount as percentage (e.g. 30 for -30%) when fullPaymentDiscount is set */
    discountPercent?: number;
    priceM2: string;
    tags: string[];
    images: string[];
    room: string;
    area: string;
    floor: string;
    floorGroup?: string;
    section: string;
    entrance: string;
    complexDueDate: string;
    available: string;
    /** Статус продажи: "открыто" | "закрыто" и т.д. */
    saleStatus?: string;
    apartmentNumber?: number | string;
    complexClass: string;
    complexGenPlanImage: string;
    sunshine: string;
    paymentConditions?: PaymentConditionForFlat[];
    /** Полная цена без скидки за 100% (для рассрочки/отложенного) */
    fullPriceBeforeDiscount?: number;
    /** Площадь м² (для расчёта стоимости с надбавкой за м²) */
    totalArea?: number;
}

/** Формат ответа GET /api/properties/[id] — поля могут отсутствовать после изменений в Strapi */
type PropertyDetailApi = Partial<{
    id: number;
    documentId: string | number;
    projectName: string;
    projectDocumentId: string;
    complexAddress: string;
    district: string;
    priceCheckmate: number;
    priceM2Checkmate: number;
    fullPaymentDiscount: number;
    room: number;
    totalArea: number;
    floor: number;
    floorGroup?: string;
    section: string;
    entrance: number;
    propertyStatus: string;
    saleStatus: string;
    apartmentNumber: number | string;
    house: number;
    images: string[];
    platformPlanImages: string[];
    tags: string[];
    complexDueDate: string;
    complexClass: string;
    complexGenPlanImage: string;
    sunshine: string;
    paymentConditions: PaymentConditionForFlat[];
}>;

/** Адаптер из ответа /api/properties/[id] в FlatDetail и Flat для PayModal */
function adaptPropertyDetail(api: PropertyDetailApi): { flatDetail: FlatDetail; originalFlat: FlatType } {
    const address = api.complexAddress || [api.district, api.projectName].filter(Boolean).join(", ") || "";
    const basePrice = api.priceCheckmate ?? 0;
    const totalArea = api.totalArea ?? 0;
    const flatAttrs = {
        room: api.room,
        totalArea: api.totalArea,
        house: api.house,
        section: api.section,
        entrance: api.entrance,
        floor: api.floor,
        floorGroup: (api as Record<string, unknown>).floorGroup,
        apartmentNumber: api.apartmentNumber,
    };
    const discountAmount = getFullPaymentDiscountFromConditions(api.paymentConditions as any, basePrice, totalArea, flatAttrs);
    const discountPercent = discountAmount > 0 && basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : undefined;
    const displayPrice = discountAmount > 0 ? Math.max(0, basePrice - discountAmount) : basePrice;
    const priceStr = formatPriceDisplay(displayPrice);
    const originalPriceStr = discountAmount > 0 ? formatPriceDisplay(basePrice) : undefined;
    const priceM2Str = `${formatPriceDisplay(api.priceM2Checkmate || 0)}/м²`;
    const images = [...(api.images || []), ...(api.platformPlanImages || [])];

    const flatDetail: FlatDetail = {
        id: api.id ?? 0,
        documentId: api.documentId != null ? String(api.documentId) : "",
        title: api.projectName ?? "",
        address,
        price: priceStr,
        originalPrice: originalPriceStr,
        discountPercent,
        priceM2: priceM2Str,
        tags: api.tags ?? [],
        images,
        room: String(api.room ?? "0"),
        area: `${api.totalArea ?? 0} м²`,
        floor: String(api.floor ?? "0"),
        floorGroup: (api as Record<string, unknown>).floorGroup as string | undefined,
        section: String(api.section ?? "0"),
        entrance: String(api.entrance ?? "0"),
        complexDueDate: api.complexDueDate ?? "",
        available: api.propertyStatus ?? "свободно",
        saleStatus: api.saleStatus,
        apartmentNumber: api.apartmentNumber ?? api.id ?? 0,
        complexClass: api.complexClass ?? "",
        complexGenPlanImage: api.complexGenPlanImage ?? "",
        sunshine: api.sunshine ?? "",
        paymentConditions: api.paymentConditions,
        fullPriceBeforeDiscount: basePrice > 0 ? basePrice : undefined,
        totalArea: api.totalArea ?? undefined,
    };

    const originalFlat: FlatType = {
        id: api.id ?? 0,
        documentId: api.documentId != null ? String(api.documentId) : "",
        title: api.projectName ?? "",
        address,
        price: discountAmount > 0 ? displayPrice : (api.priceCheckmate ?? 0),
        priceM2: api.priceM2Checkmate ?? 0,
        tags: Array.isArray(api.tags) ? api.tags.join(",") : "",
        img: images.join(","),
        room: api.room ?? 0,
        area: api.totalArea ?? 0,
        floor: api.floor ?? 0,
        section: api.section != null && api.section !== "" ? String(api.section) : "0",
        entrance: api.entrance ?? 0,
        complexDueDate: api.complexDueDate ?? "",
        available: api.propertyStatus ?? "свободно",
        complexClass: api.complexClass ?? "",
        complexGenPlanImage: api.complexGenPlanImage ?? "",
        sunshine: api.sunshine ?? "",
        apartmentNumber: Number(api.apartmentNumber ?? 0),
        house: Number(api.house ?? 0),
        fullPaymentDiscount: discountAmount > 0 ? discountAmount : undefined,
        discountPercent,
        originalPrice: originalPriceStr,
        paymentConditions: api.paymentConditions,
        fullPriceBeforeDiscount: basePrice > 0 ? basePrice : undefined,
        projectDocumentId: api.projectDocumentId,
        totalArea: api.totalArea ?? undefined,
        floorGroup: (api as Record<string, unknown>).floorGroup as string | undefined,
    };

    return { flatDetail, originalFlat };
}

export default function FlatsDetailPage({ id }: { id: string | string[] }) {
    const router = useRouter();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const t = useTranslations();
    const [flat, setFlat] = useState<FlatDetail | null>(null);
    const [originalFlat, setOriginalFlat] = useState<FlatType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [selectedInstallmentPvIndex, setSelectedInstallmentPvIndex] = useState(0);
    const [selectedDefferedPvIndex, setSelectedDefferedPvIndex] = useState(0);
    const [activePlan, setActivePlan] = useState("Планировка");
    const [shareMessage, setShareMessage] = useState<boolean | null>(null);
    const [payStartLoading, setPayStartLoading] = useState(false);
    const [payStartError, setPayStartError] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfRef = useRef<HTMLDivElement | null>(null);

    const dispatch = useDispatch();
    const favoriteFlatIds = useSelector((state: RootState) => state.favorites.flatIds);
    const isFavorite = flat != null && favoriteFlatIds.includes(flat.id);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const user = useSelector((state: RootState) => state.auth.user);
    /** Есть ли активная сделка по квартире (Бронь/Ожидания оплаты/договора) — решаем по сделкам, не по propertyStatus */
    const [hasActiveDeal, setHasActiveDeal] = useState<boolean | null>(null);
    const canOpenPayModal = (user?.role === "manager" || user?.role === "admin") && hasActiveDeal === false;

    /** Сделка в «Ожидания договора»/«Договор подписан» по этой квартире — показать «Продолжить подписание» после перезагрузки */
    const [resumeDealId, setResumeDealId] = useState<string | null>(null);

    const [pan, setPan] = useState({ x: 0, y: 0 }); // px
    const panRef = useRef(pan);
    useEffect(() => { panRef.current = pan; }, [pan]);

    const dragRef = useRef({
        active: false,
        pointerId: 0,
        startX: 0,
        startY: 0,
        startPanX: 0,
        startPanY: 0,
    });

    const clampPan = (next: { x: number; y: number }, scale: number) => {
        const el = viewportRef.current;
        if (!el) return next;

        const w = el.clientWidth;
        const h = el.clientHeight;

        // Мы масштабируем контент "w x h" -> "w*scale x h*scale"
        // Допустимое смещение — половина "лишнего" размера
        const maxX = Math.max(0, (w * (scale - 1)) / 2);
        const maxY = Math.max(0, (h * (scale - 1)) / 2);

        return {
            x: Math.min(maxX, Math.max(-maxX, next.x)),
            y: Math.min(maxY, Math.max(-maxY, next.y)),
        };
    };

    useEffect(() => {
        if (!id) {
            notFound();
            return;
        }

        const fetchFlat = async () => {
            try {
                setLoading(true);
                const flatId = Array.isArray(id) ? id[0] : id;
                if (!flatId) {
                    notFound();
                    return;
                }

                const [res, dealRes] = await Promise.all([
                    fetch(`/api/properties/${flatId}`),
                    fetch(`/api/properties/${flatId}/active-deal`),
                ]);
                if (!res.ok) {
                    notFound();
                    return;
                }
                const flatData: PropertyDetailApi = await res.json();
                if (!flatData || typeof flatData !== "object" || (flatData.id == null && flatData.documentId == null)) {
                    notFound();
                    return;
                }
                const { flatDetail, originalFlat } = adaptPropertyDetail(flatData);
                setFlat(flatDetail);
                setOriginalFlat(originalFlat);
                const dealJson = await dealRes.json().catch(() => ({}));
                setHasActiveDeal(dealJson.hasActiveDeal === true);
            } catch (err) {
                notFound();
            } finally {
                setLoading(false);
            }
        };

        fetchFlat();
    }, [id]);

    useEffect(() => {
        const flatId = Array.isArray(id) ? id?.[0] : id;
        if (!flatId) return;
        const onVisible = async () => {
            const propId = flatId;
            try {
                const r = await fetch(`/api/properties/${propId}/active-deal`);
                const data = await r.json().catch(() => ({}));
                setHasActiveDeal(data.hasActiveDeal === true);
            } catch {
                setHasActiveDeal(true);
            }
        };
        const handler = () => { if (document.visibilityState === "visible") onVisible(); };
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
    }, [id]);

    // После перезагрузки: если в sessionStorage есть deal по этой квартире в статусе «Ожидания договора»/«Договор подписан» — показать «Продолжить подписание»
    useEffect(() => {
        if (!flat?.documentId || !originalFlat || !user) {
            setResumeDealId(null);
            return;
        }
        const savedId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("payDealId") : null;
        if (!savedId) {
            setResumeDealId(null);
            return;
        }
        fetch(`/api/deals/${savedId}/summary`, { credentials: "include" })
            .then((r) => r.json().catch(() => ({})))
            .then((data: { propertyDocumentId?: string; dealStatus?: string }) => {
                const match = data?.propertyDocumentId === flat.documentId;
                const canResume = data?.dealStatus === "Ожидания договора" || data?.dealStatus === "Договор подписан";
                setResumeDealId(match && canResume ? savedId : null);
            })
            .catch(() => setResumeDealId(null));
    }, [flat?.documentId, originalFlat, user]);

    const copyToClipboard = async (text: string) => {
        // основной путь (современные браузеры + https)
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        // fallback (Safari/HTTP/старые браузеры)
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy_failed");
    };

    const handleCopyLink = async () => {
        const url = window.location.href;
        await copyToClipboard(url);
        setShareMessage(true);
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            dispatch(openAuth());
            return;
        }
        if (flat) dispatch(toggleFavorite(flat.id));
    };

    const handleButtonClick = (buttonType: string) => {
        setActiveButton(buttonType);
    };

    const payStartInFlightRef = useRef(false);

    const handleOpenPayModal = async () => {
        if (!originalFlat || !activeButton) return;
        if (payStartInFlightRef.current || payStartLoading) return;
        setPayStartError(null);
        setPayStartLoading(true);
        payStartInFlightRef.current = true;
        try {
            const propId = originalFlat.documentId;
            const activeDealRes = await fetch(`/api/properties/${propId}/active-deal`);
            const activeDealJson = await activeDealRes.json().catch(() => ({}));
            if (activeDealJson.hasActiveDeal === true) {
                if (activeDealJson.canResume === true && activeDealJson.dealDocumentId) {
                    dispatch(
                        openPay({
                            flat: originalFlat,
                            paymentMethod: activeButton,
                            step: "payment",
                            dealDocumentId: String(activeDealJson.dealDocumentId),
                        })
                    );
                    return;
                }
                setPayStartError(t("flat_already_reserved"));
                setHasActiveDeal(true);
                return;
            }
            const res = await fetch("/api/deals/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    propertyId: originalFlat.documentId,
                    paymentMethod: activeButton,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = res.status === 409
                    ? t("flat_already_reserved")
                    : (data?.error ?? t("failed_to_reserve_flat"));
                setPayStartError(msg);
                if (res.status === 409) setHasActiveDeal(true);
                return;
            }
            const dealDocumentId = data?.deal?.documentId ?? data?.deal?.id ?? null;
            dispatch(
                openPay({
                    flat: originalFlat,
                    paymentMethod: activeButton,
                    step: "payment",
                    dealDocumentId: dealDocumentId ?? undefined,
                })
            );
        } catch {
            setPayStartError(t("network_error"));
        } finally {
            setPayStartLoading(false);
            payStartInFlightRef.current = false;
        }
    };

    const handlePlanClick = (buttonType: string) => {
        setActivePlan(buttonType);
    };

    useEffect(() => {
        setZoomScale(1);
        setPan({ x: 0, y: 0 });
    }, [activePlan]);

    useEffect(() => {
        if (zoomScale === 1) setPan({ x: 0, y: 0 });
        else setPan((p) => clampPan(p, zoomScale));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomScale]);

    const onPointerDown = (e: React.PointerEvent) => {
        if (zoomScale <= 1) return;

        // чтобы не выделялся текст/не скроллилась страница
        e.preventDefault();

        dragRef.current.active = true;
        dragRef.current.pointerId = e.pointerId;
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
        dragRef.current.startPanX = panRef.current.x;
        dragRef.current.startPanY = panRef.current.y;

        // захватываем указатель, чтобы получать move даже если курсор ушел
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.active || zoomScale <= 1) return;

        e.preventDefault();

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        const next = {
            x: dragRef.current.startPanX + dx,
            y: dragRef.current.startPanY + dy,
        };

        setPan(clampPan(next, zoomScale));
    };

    const endDrag = (e: React.PointerEvent) => {
        if (!dragRef.current.active) return;
        dragRef.current.active = false;

        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(dragRef.current.pointerId);
        } catch { }
    };

    const getActivePlanSrc = () => {
        if (!flat?.images) return null;
        if (activePlan === "Планировка") return flat.images[0] ?? null;
        if (activePlan === "Этаж") return flat.images[1] ?? null;
        return null;
    };
    const planSrc = getActivePlanSrc();

    const handleZoomOut = () => setZoomScale((s) => Math.max(1, Number((s - 0.25).toFixed(2))));
    const handleZoomIn = () => setZoomScale((s) => Math.min(4, Number((s + 0.25).toFixed(2))));

    const fileToDataUrl = async (url: string): Promise<string> => {
        // Важно: url должен быть доступен с CORS, иначе fetch упадет.
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`image_fetch_failed: ${res.status}`);

        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("file_reader_failed"));
            reader.readAsDataURL(blob);
        });
    };

    const waitForImages = async (root: HTMLElement) => {
        const imgs = Array.from(root.querySelectorAll("img"));
        await Promise.all(
            imgs.map((img) => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise<void>((resolve) => {
                    const done = () => resolve();
                    img.addEventListener("load", done, { once: true });
                    img.addEventListener("error", done, { once: true }); // даже если ошибка — не зависаем
                });
            })
        );
    };

    /** Целевая ширина для планов в PDF (выше = чётче, но тяжелее файл). */
    const PLAN_TARGET_SIZE = 2400;

    /** Конвертирует SVG в PNG data URL с высоким разрешением для чёткого PDF. */
    const svgToPngDataUrl = (svgDataUrl: string): Promise<string | null> =>
        new Promise((resolve) => {
            const img = document.createElement("img");
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    let w = img.naturalWidth || 0;
                    let h = img.naturalHeight || 0;
                    if (w <= 0 || h <= 0) {
                        w = PLAN_TARGET_SIZE;
                        h = Math.round((PLAN_TARGET_SIZE * 3) / 4);
                    } else if (w < PLAN_TARGET_SIZE || h < PLAN_TARGET_SIZE) {
                        const scale = PLAN_TARGET_SIZE / Math.max(w, h);
                        w = Math.round(w * scale);
                        h = Math.round(h * scale);
                    }
                    const maxSide = 4096;
                    if (w > maxSide || h > maxSide) {
                        const s = maxSide / Math.max(w, h);
                        w = Math.round(w * s);
                        h = Math.round(h * s);
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        resolve(null);
                        return;
                    }
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/png"));
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = svgDataUrl;
        });

    /** Загружает картинку в data URL: сначала через прокси (без CORS), иначе напрямую. SVG конвертируется в PNG. */
    const fetchImageAsDataUrl = async (absoluteUrl: string): Promise<string | null> => {
        if (!absoluteUrl || absoluteUrl.startsWith("data:")) return absoluteUrl || null;
        const blobToData = (blob: Blob) =>
            new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        const tryProxy = async () => {
            const proxyRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(absoluteUrl)}`);
            if (!proxyRes.ok) return null;
            const blob = await proxyRes.blob();
            return await blobToData(blob);
        };
        const tryDirect = async () => {
            const res = await fetch(absoluteUrl, { mode: "cors" });
            if (!res.ok) return null;
            const blob = await res.blob();
            return await blobToData(blob);
        };
        let dataUrl: string | null = null;
        try {
            dataUrl = await tryProxy();
        } catch {
            // прокси недоступен или ошибка
        }
        if (!dataUrl) {
            try {
                dataUrl = await tryDirect();
            } catch {
                return null;
            }
        }
        if (!dataUrl) return null;
        const isSvg =
            dataUrl.startsWith("data:image/svg") ||
            /\.svg(\?|$)/i.test(absoluteUrl) ||
            (typeof document !== "undefined" && dataUrl.includes("image/svg"));
        if (isSvg) {
            return await svgToPngDataUrl(dataUrl);
        }
        return dataUrl;
    };

    /** Открытие PDF в новой вкладке (вместо скачивания). */
    const openPdf = (pdf: import("jspdf").jsPDF) => {
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    const generatePDF = async () => {
        if (!flat || !pdfRef.current) return;

        setIsGeneratingPDF(true);
        const savedSrc = new Map<HTMLImageElement, string>();

        try {
            // дать React дорендерить скрытый блок
            await new Promise(requestAnimationFrame);

            // Собираем URL планировок/этажа/генплана и подгружаем в data URL (прямой fetch или через прокси)
            const toAbsoluteUrl = (u: string) =>
                u.startsWith("http") ? u : (typeof window !== "undefined" ? window.location.origin + (u.startsWith("/") ? "" : "/") + u : u);
            const imageUrls = [
                flat.images?.[0],
                flat.images?.[1],
                flat.complexGenPlanImage,
            ].filter((u): u is string => Boolean(u));
            const dataUrlMap = new Map<string, string>();
            await Promise.all(
                imageUrls.map(async (url) => {
                    const absoluteUrl = toAbsoluteUrl(url);
                    const dataUrl = await fetchImageAsDataUrl(absoluteUrl);
                    if (dataUrl) {
                        dataUrlMap.set(url, dataUrl);
                        dataUrlMap.set(absoluteUrl, dataUrl);
                    }
                })
            );

            const resolveDataUrl = (src: string | null): string | null => {
                if (!src || src.startsWith("data:")) return null;
                return dataUrlMap.get(src) ?? dataUrlMap.get(toAbsoluteUrl(src)) ?? null;
            };

            // Подменяем src картинок в реальном DOM на data URL и ждём загрузки каждой
            const rootEl = pdfRef.current;
            const imagesToWait: HTMLImageElement[] = [];
            rootEl.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
                const src = img.getAttribute("src");
                const dataUrl = resolveDataUrl(src);
                if (dataUrl) {
                    savedSrc.set(img, src ?? "");
                    img.src = dataUrl;
                    imagesToWait.push(img);
                }
            });
            await Promise.all(
                imagesToWait.map(
                    (img) =>
                        new Promise<void>((resolve) => {
                            if (img.complete && img.naturalWidth > 0) {
                                resolve();
                                return;
                            }
                            const done = () => resolve();
                            img.addEventListener("load", done, { once: true });
                            img.addEventListener("error", done, { once: true });
                            setTimeout(done, 5000);
                        })
                )
            );
            await waitForImages(pdfRef.current);

            const canvas = await html2canvas(pdfRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#ffffff",
                removeContainer: true,
                onclone: (clonedDoc) => {
                    const root = clonedDoc.querySelector(".pdf-safe-root");
                    if (!root) return;

                    // делаем клон "видимым" для html2canvas
                    (root as HTMLElement).style.opacity = "1";
                    (root as HTMLElement).style.zIndex = "2147483647";

                    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
                        const cs = clonedDoc.defaultView?.getComputedStyle(el);
                        if (!cs) return;

                        const bad = (v: string) =>
                            v.includes("lab(") ||
                            v.includes("lch(") ||
                            v.includes("oklab(") ||
                            v.includes("oklch(") ||
                            v.includes("color(");

                        if (bad(cs.color)) el.style.color = "rgb(17,17,17)";
                        if (bad(cs.backgroundColor)) el.style.backgroundColor = "rgb(255,255,255)";
                        if (bad(cs.borderColor)) el.style.borderColor = "rgb(229,231,235)";
                    });
                },
            });

            // 🔥 быстро проверим, что не пусто
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error(`canvas_empty: ${canvas.width}x${canvas.height}`);
            }

            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const props = pdf.getImageProperties(imgData);
            const imgWidth = pageWidth;
            const imgHeight = (props.height * imgWidth) / props.width;

            let y = 0;
            pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);

            while (y + imgHeight > pageHeight) {
                y -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);
            }

            openPdf(pdf);
        } catch (e) {
            console.error(e);
            alert("Ошибка генерации PDF (проверь консоль)");
        } finally {
            setIsGeneratingPDF(false);
            // восстанавливаем оригинальные src картинок в DOM
            savedSrc.forEach((src, img) => {
                img.src = src;
            });
        }
    };

    /** Способы оплаты по программе для этой квартиры. Активный = Active/Активный, validFrom <= today. Поддержка русских значений: Полная оплата, Рассрочка, Отложенный платеж, Ипотека. */
    const availablePaymentMethods = useMemo(() => {
        const list: ("full" | "installment" | "deffered" | "hypothec")[] = ["full"];
        const active = (flat?.paymentConditions || []).filter((c) => isActivePaymentStatus(c) && isPaymentConditionValidToday(c));
        if (!active.length) return list;
        if (active.some((c) => isPaymentMethod(c, "installment"))) list.push("installment");
        if (active.some((c) => isPaymentMethod(c, "deffered"))) list.push("deffered");
        return list;
    }, [flat?.paymentConditions]);

    const baseFullPrice = flat?.fullPriceBeforeDiscount ?? 0;
    const basePriceM2 = flat?.priceM2 ?? 0;
    const totalArea = flat?.totalArea ?? 0;
    const flatAttrs = useMemo(() => {
        if (!flat) return undefined;
        const areaNum = flat.totalArea ?? (typeof flat.area === "number" ? flat.area : parseFloat(String(flat.area).replace(/[^\d.,]/g, "").replace(",", ".")) || undefined);
        return {
            room: flat.room,
            totalArea: areaNum,
            section: flat.section,
            entrance: flat.entrance,
            floor: flat.floor,
            floorGroup: flat.floorGroup,
            apartmentNumber: flat.apartmentNumber,
        };
    }, [flat?.room, flat?.totalArea, flat?.area, flat?.section, flat?.entrance, flat?.floor, flat?.floorGroup, flat?.apartmentNumber]);
    const installmentPreview = useMemo(
        () => getInstallmentPreview(flat?.paymentConditions ?? [], selectedInstallmentPvIndex, baseFullPrice, totalArea, flatAttrs),
        [flat?.paymentConditions, selectedInstallmentPvIndex, baseFullPrice, totalArea, flatAttrs]
    );
    const defferedPreview = useMemo(
        () => getDefferedPreview(flat?.paymentConditions ?? [], selectedDefferedPvIndex, baseFullPrice, totalArea, flatAttrs),
        [flat?.paymentConditions, selectedDefferedPvIndex, baseFullPrice, totalArea, flatAttrs]
    );

    const installmentTableData = useMemo(() => {
        if (!flat || !totalArea) return [];
        const cols: {
            label: string;
            cost: number;
            firstPayment: number;
            remainder: number;
            pricePerM2: number;
        }[] = [];

        const base = flat.fullPriceBeforeDiscount ?? parsePriceString(flat.originalPrice) ?? parsePriceString(flat.price) ?? baseFullPrice;
        if (base > 0) {
            const fullDiscount = getFullPaymentDiscountFromConditions(flat.paymentConditions as any, base, totalArea, flatAttrs);
            const fullCost = Math.max(0, base - fullDiscount);
            const fullPricePerM2 = totalArea > 0 ? Math.round(fullCost / totalArea) : 0;
            cols.push({
                label: "100",
                cost: fullCost,
                firstPayment: fullCost,
                remainder: 0,
                pricePerM2: fullPricePerM2,
            });
        }

        if (baseFullPrice && installmentPreview.options.length) {
            installmentPreview.options.slice(0, 4).forEach((opt) => {
                const pct = parseDownPaymentPercent(opt.downPayment) || 0;
                if (!pct) return;
                const raisePerM2 = parseRaise(opt.raise);
                const cost = baseFullPrice + raisePerM2 * totalArea;
                const firstPayment = cost > 0 ? Math.round((cost * pct) / 100) : 0;
                const remainder = cost > 0 ? Math.max(0, cost - firstPayment) : 0;
                const pricePerM2 = totalArea > 0 ? Math.round(cost / totalArea) : 0;
                cols.push({
                    label: String(pct),
                    cost,
                    firstPayment,
                    remainder,
                    pricePerM2,
                });
            });
        }

        return cols;
    }, [flat, flatAttrs, baseFullPrice, totalArea, installmentPreview.options]);

    /** Actual total price and price per m² for the selected payment type */
    const displayPriceForPayment = useMemo(() => {
        if (!flat) return { main: "—", crossedOut: undefined as string | undefined, priceM2: "—" };
        const area = totalArea || 1;
        const formatM2 = (amount: number) => `${formatPriceDisplay(amount)}/м²`;
        switch (activeButton) {
            case "full": {
                const base = flat.fullPriceBeforeDiscount ?? parsePriceString(flat.originalPrice) ?? parsePriceString(flat.price) ?? 0;
                const area = totalArea || 1;
                const fullDiscount = getFullPaymentDiscountFromConditions(flat.paymentConditions as any, base, area, flatAttrs);
                const mainNum = Math.max(0, base - fullDiscount);
                return {
                    main: formatPriceDisplay(mainNum),
                    crossedOut: fullDiscount > 0 && base > 0 ? formatPriceDisplay(base) : flat.originalPrice,
                    priceM2: totalArea > 0 ? `${formatPriceDisplay(Math.round(mainNum / totalArea))}/м²` : flat.priceM2,
                };
            }
            case "installment":
                return {
                    main: formatPriceDisplay(installmentPreview.fullPrice),
                    crossedOut: undefined,
                    priceM2: formatM2((Math.round(installmentPreview.fullPrice / area))),
                };
            case "deffered":
                return {
                    main: formatPriceDisplay(defferedPreview.fullPrice),
                    crossedOut: undefined,
                    priceM2: formatM2((Math.round(defferedPreview.fullPrice / area))),
                };
            case "hypothec":
                return {
                    main: flat.originalPrice ?? flat.price,
                    crossedOut: undefined,
                    priceM2: formatM2((Math.round(defferedPreview.fullPrice / area))),
                };
            default:
                return {
                    main: flat.originalPrice ?? flat.price,
                    crossedOut: undefined,
                    priceM2: basePriceM2,
                };
        }
    }, [flat, activeButton, totalArea, installmentPreview.fullPrice, defferedPreview.fullPrice, flatAttrs]);

    /** Квартира недоступна для бронирования, если продажа закрыта или статус не «свободно» */
    const isUnavailable =
        !!flat &&
        (String(flat.saleStatus ?? "").trim().toLowerCase() !== "открыто" ||
            String(flat.available ?? "").trim().toLowerCase() !== "свободно");

    if (loading) {
        return (
            <div className="py-[40px]">
                <div className="wrapper flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A3C7E] mb-4"></div>
                        <p className="text-[#1A3C7E] font-medium">{t("loading_flat")}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !flat || isUnavailable) {
        notFound();
    }

    return (
        <>
            <div className="wrapper pt-4 pb-3">
                <Button
                    type="button"
                    variant="light"
                    className="flex items-center gap-1 px-0 text-[14px] text-[#1A3C7E]"
                    onClick={() => router.back()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M9.99984 3.33325L6.33317 7.99992L9.99984 12.6666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[14px] font-medium text-[#1A3C7E]">{t("back")}</span>
                </Button>
            </div>
            <div>
                <div className="wrapper flex items-center gap-[32px] flex-shrink-0 flex-wrap">
                    <div className="flex w-full max-h-[761px] p-[32px] flex-col justify-start items-center gap-[32px] flex-[1_0_0] self-stretch rounded-[32px] bg-[#F4F6FB]">
                        <div className="flex items-center gap-[32px] self-stretch">
                            <div className="flex items-center gap-[8px] flex-[1_0_0]">
                                {flat?.images?.[0] && (
                                    <Button
                                        className={`flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[12px] text-[15px] not-italic font-medium leading-[20px] ${activePlan === "Планировка" ? "bg-[#1A3C7E] text-white" : "bg-white text-[#1A3C7E]"
                                            }`}
                                        onClick={() => handlePlanClick("Планировка")}
                                    >
                                        {t("flat_plan")}
                                    </Button>
                                )}

                                {flat?.images?.[1] && (
                                    <Button
                                        className={`flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[12px] text-[15px] not-italic font-medium leading-[20px] ${activePlan === "Этаж" ? "bg-[#1A3C7E] text-white" : "bg-white text-[#1A3C7E]"
                                            }`}
                                        onClick={() => handlePlanClick("Этаж")}
                                    >
                                        {t("on_the_floor")}
                                    </Button>
                                )}

                            </div>
                            <div className="hidden lg:flex items-center gap-[8px]">
                                <Button
                                    onClick={handleFavoriteClick}
                                    className={`flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] text-[15px] not-italic font-medium leading-[20px] ${isFavorite ? "bg-[#1A3C7E] text-white" : "bg-[#FFF] text-[#1C274C]"}`}
                                    title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M5.97416 12.6073L6.43848 12.0183L5.97416 12.6073ZM7.99967 3.66709L7.45931 4.18719C7.6007 4.33408 7.79579 4.41709 7.99967 4.41709C8.20356 4.41709 8.39865 4.33408 8.54004 4.18719L7.99967 3.66709ZM10.0252 12.6073L10.4895 13.1962L10.0252 12.6073ZM5.97416 12.6073L6.43848 12.0183C5.4132 11.21 4.33603 10.4524 3.47879 9.48717C2.64727 8.55085 2.08301 7.47831 2.08301 6.0914H1.33301H0.583008C0.583008 7.94644 1.35855 9.35867 2.35722 10.4832C3.33018 11.5788 4.57358 12.4582 5.50985 13.1962L5.97416 12.6073ZM1.33301 6.0914H2.08301C2.08301 4.75102 2.84003 3.63995 3.85318 3.17683C4.81905 2.73533 6.15131 2.82823 7.45931 4.18719L7.99967 3.66709L8.54004 3.14699C6.84815 1.38917 4.84707 1.07324 3.22958 1.8126C1.65937 2.53035 0.583008 4.18982 0.583008 6.0914H1.33301ZM5.97416 12.6073L5.50985 13.1962C5.84904 13.4636 6.22908 13.7618 6.61809 13.9891C7.00687 14.2163 7.47594 14.4167 7.99967 14.4167V13.6667V12.9167C7.85674 12.9167 7.65915 12.8601 7.37488 12.694C7.09085 12.5281 6.79146 12.2965 6.43848 12.0183L5.97416 12.6073ZM10.0252 12.6073L10.4895 13.1962C11.4258 12.4582 12.6692 11.5788 13.6421 10.4832C14.6408 9.35867 15.4163 7.94644 15.4163 6.0914H14.6663H13.9163C13.9163 7.47831 13.3521 8.55085 12.5206 9.48717C11.6633 10.4524 10.5861 11.21 9.56087 12.0183L10.0252 12.6073ZM14.6663 6.0914H15.4163C15.4163 4.18982 14.34 2.53035 12.7698 1.8126C11.1523 1.07324 9.1512 1.38917 7.45931 3.14699L7.99967 3.66709L8.54004 4.18719C9.84804 2.82823 11.1803 2.73533 12.1462 3.17683C13.1593 3.63995 13.9163 4.75102 13.9163 6.0914H14.6663ZM10.0252 12.6073L9.56087 12.0183C9.20789 12.2965 8.9085 12.5281 8.62447 12.694C8.3402 12.8601 8.14261 12.9167 7.99967 12.9167V13.6667V14.4167C8.52341 14.4167 8.99248 14.2163 9.38126 13.9891C9.77027 13.7618 10.1503 13.4636 10.4895 13.1962L10.0252 12.6073Z" fill="currentColor" />
                                    </svg>
                                </Button>
                                <Button
                                    type="button"
                                    onClick={generatePDF}
                                    disabled={isGeneratingPDF}
                                    className="flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] bg-[#FFF] text-[#FFF] text-[15px] not-italic font-medium leading-[20px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Открыть PDF"
                                >
                                    {isGeneratingPDF ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1C274C]"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M10.6663 4.00004H5.33301C3.44739 4.00004 2.50458 4.00004 1.91879 4.58583C1.33301 5.17161 1.33301 6.11442 1.33301 8.00004C1.33301 9.88566 1.33301 10.8285 1.91879 11.4143C2.2485 11.744 2.6913 11.8881 3.35164 11.9511C3.33299 11.4692 3.333 10.2349 3.33301 9.66673C3.14891 9.66673 2.99967 9.51747 2.99967 9.33337C2.99967 9.14928 3.14891 9.00004 3.33301 9.00004H12.6663C12.8504 9.00004 12.9997 9.14928 12.9997 9.33337C12.9997 9.51747 12.8504 9.66694 12.6663 9.66694C12.6663 10.235 12.6664 11.4693 12.6477 11.9511C13.3081 11.8881 13.7509 11.744 14.0806 11.4143C14.6663 10.8285 14.6663 9.88566 14.6663 8.00004C14.6663 6.11442 14.6663 5.17161 14.0806 4.58583C13.4948 4.00004 12.552 4.00004 10.6663 4.00004ZM5.99967 7.16671C6.27582 7.16671 6.49967 6.94285 6.49967 6.66671C6.49967 6.39057 6.27582 6.16671 5.99967 6.16671H3.99967C3.72353 6.16671 3.49967 6.39057 3.49967 6.66671C3.49967 6.94285 3.72353 7.16671 3.99967 7.16671H5.99967ZM11.333 7.33337C11.7012 7.33337 11.9997 7.0349 11.9997 6.66671C11.9997 6.29852 11.7012 6.00004 11.333 6.00004C10.9648 6.00004 10.6663 6.29852 10.6663 6.66671C10.6663 7.0349 10.9648 7.33337 11.333 7.33337Z" fill="#1C274C" />
                                            <path d="M11.4137 1.91916C10.8279 1.33337 9.88514 1.33337 7.99952 1.33337C6.1139 1.33337 5.17109 1.33337 4.5853 1.91916C4.25706 2.24741 4.11275 2.68775 4.0493 3.34327C4.42213 3.33335 4.83422 3.33336 5.28596 3.33337H10.7134C11.165 3.33336 11.577 3.33335 11.9497 3.34326C11.8863 2.68775 11.742 2.2474 11.4137 1.91916Z" fill="#1C274C" />
                                            <path fillRule="evenodd" clipRule="evenodd" d="M11.9997 9.66671C11.9997 11.5523 11.9997 13.4951 11.4139 14.0809C10.8281 14.6667 9.88529 14.6667 7.99967 14.6667C6.11406 14.6667 5.17125 14.6667 4.58546 14.0809C3.99968 13.4951 3.99968 11.5523 3.99967 9.66671H11.9997ZM10.4997 11.1667C10.4997 11.4429 10.2758 11.6667 9.99967 11.6667H5.99967C5.72353 11.6667 5.49967 11.4429 5.49967 11.1667C5.49967 10.8906 5.72353 10.6667 5.99967 10.6667H9.99967C10.2758 10.6667 10.4997 10.8906 10.4997 11.1667ZM9.16634 13.1667C9.16634 13.4429 8.94248 13.6667 8.66634 13.6667H5.99967C5.72353 13.6667 5.49967 13.4429 5.49967 13.1667C5.49967 12.8906 5.72353 12.6667 5.99967 12.6667H8.66634C8.94248 12.6667 9.16634 12.8906 9.16634 13.1667Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleCopyLink}
                                    className="flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] bg-[#FFF] text-[#FFF] text-[15px] not-italic font-medium leading-[20px]"
                                >
                                    {!shareMessage && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M9.30305 3.45565L12.6216 6.40547C13.242 6.95693 13.5522 7.23265 13.6665 7.55824C13.7669 7.84416 13.7669 8.15574 13.6665 8.44166C13.5522 8.76724 13.242 9.04297 12.6216 9.59442L9.30305 12.5442C9.02152 12.7945 8.88076 12.9196 8.76119 12.9241C8.65732 12.928 8.55758 12.8832 8.49148 12.803C8.41539 12.7106 8.41539 12.5223 8.41539 12.1456V10.2857C6.79667 10.2857 5.08696 10.8056 3.83855 11.7285C3.18862 12.2089 2.86364 12.4492 2.73987 12.4397C2.61922 12.4305 2.54265 12.3833 2.48005 12.2798C2.41583 12.1736 2.47255 11.8416 2.586 11.1778C3.32265 6.86699 6.28929 5.71423 8.41539 5.71423V3.85426C8.41539 3.47759 8.41539 3.28925 8.49148 3.19691C8.55758 3.1167 8.65732 3.07191 8.76119 3.0758C8.88076 3.08027 9.02152 3.2054 9.30305 3.45565Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                    {shareMessage && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-row justify-end items-center w-full gap-6">
                            {activePlan === "Планировка" ? (
                                flat.images && flat.images.length > 0 ? (
                                    <div
                                        ref={viewportRef}
                                        className="relative w-full h-[300px] lg:h-[500px] overflow-hidden flex items-center justify-center touch-none"
                                        onPointerDown={onPointerDown}
                                        onPointerMove={onPointerMove}
                                        onPointerUp={endDrag}
                                        onPointerCancel={endDrag}
                                        style={{
                                            cursor: zoomScale > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "default",
                                        }}
                                    >
                                        <div
                                            className="relative w-full h-full"
                                            style={{
                                                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomScale})`,
                                                transformOrigin: "center center",
                                                willChange: "transform",
                                            }}
                                        >
                                            <Image
                                                rel="preload"
                                                src={flat.images[0]}
                                                alt={flat.title}
                                                fill
                                                priority
                                                sizes="(max-width: 1024px) 100vw, 600px"
                                                className="object-contain"
                                                draggable={false}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-[598px] h-[534px] bg-gray-200 rounded-[12px] flex items-center justify-center">
                                        <span className="text-gray-500">{t("no_image")}</span>
                                    </div>
                                )
                            ) : activePlan === "Этаж" ? (
                                flat.images && flat.images.length > 1 ? (
                                    <div
                                        ref={viewportRef}
                                        className="relative w-full h-[300px] lg:h-[500px] overflow-hidden flex items-center justify-center touch-none"
                                        onPointerDown={onPointerDown}
                                        onPointerMove={onPointerMove}
                                        onPointerUp={endDrag}
                                        onPointerCancel={endDrag}
                                        style={{
                                            cursor: zoomScale > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "default",
                                        }}
                                    >
                                        <div
                                            className="relative w-full h-full"
                                            style={{
                                                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomScale})`,
                                                transformOrigin: "center center",
                                                willChange: "transform",
                                            }}
                                        >
                                            <Image
                                                rel="preload"
                                                src={flat.images[1]}
                                                alt={flat.title}
                                                fill
                                                priority
                                                sizes="(max-width: 1024px) 100vw, 600px"
                                                className="object-contain"
                                                draggable={false}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-[598px] h-[534px] bg-gray-200 rounded-[12px] flex items-center justify-center">
                                        <span className="text-gray-500">{t("no_image")}</span>
                                    </div>
                                )
                            ) : null}
                            <div className="hidden lg:flex flex-col w-[40px] items-center justify-center gap-[6px] h-[90px] rounded-[22px] bg-[#FFF] py-2">
                                <Button
                                    onClick={handleZoomOut}
                                    className="w-full min-w-0 h-[40px] rounded-[12px] bg-transparent text-[#1A3C7E]"
                                >
                                    −
                                </Button>
                                <div className="w-full lg:max-w-[463px] h-[1px] flex-shrink-0 bg-black opacity-10"></div>
                                <Button
                                    onClick={handleZoomIn}
                                    className="w-full min-w-0 h-[40px] rounded-[12px] bg-transparent text-[#1A3C7E]"
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                        <div className="flex lg:hidden w-full items-center justify-evenly gap-[8px]">
                            <div className="flex lg:hidden flex-row w-[90px] items-center justify-center gap-[6px] h-[40px] rounded-[22px] bg-[#FFF] py-2">
                                <Button
                                    onClick={handleZoomOut}
                                    className="w-full min-w-0 h-[40px] rounded-[12px] bg-transparent text-[#1A3C7E]"
                                >
                                    −
                                </Button>
                                <div className="w-[1px] h-full flex-shrink-0 bg-black opacity-10"></div>
                                <Button
                                    onClick={handleZoomIn}
                                    className="w-full min-w-0 h-[40px] rounded-[12px] bg-transparent text-[#1A3C7E]"
                                >
                                    +
                                </Button>
                            </div>
                            <div className="flex">
                                <Button
                                    onClick={handleFavoriteClick}
                                    className={`flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] text-[15px] not-italic font-medium leading-[20px] ${isFavorite ? "bg-[#1A3C7E] text-white" : "bg-[#FFF] text-[#1C274C]"}`}
                                    title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M5.97416 12.6073L6.43848 12.0183L5.97416 12.6073ZM7.99967 3.66709L7.45931 4.18719C7.6007 4.33408 7.79579 4.41709 7.99967 4.41709C8.20356 4.41709 8.39865 4.33408 8.54004 4.18719L7.99967 3.66709ZM10.0252 12.6073L10.4895 13.1962L10.0252 12.6073ZM5.97416 12.6073L6.43848 12.0183C5.4132 11.21 4.33603 10.4524 3.47879 9.48717C2.64727 8.55085 2.08301 7.47831 2.08301 6.0914H1.33301H0.583008C0.583008 7.94644 1.35855 9.35867 2.35722 10.4832C3.33018 11.5788 4.57358 12.4582 5.50985 13.1962L5.97416 12.6073ZM1.33301 6.0914H2.08301C2.08301 4.75102 2.84003 3.63995 3.85318 3.17683C4.81905 2.73533 6.15131 2.82823 7.45931 4.18719L7.99967 3.66709L8.54004 3.14699C6.84815 1.38917 4.84707 1.07324 3.22958 1.8126C1.65937 2.53035 0.583008 4.18982 0.583008 6.0914H1.33301ZM5.97416 12.6073L5.50985 13.1962C5.84904 13.4636 6.22908 13.7618 6.61809 13.9891C7.00687 14.2163 7.47594 14.4167 7.99967 14.4167V13.6667V12.9167C7.85674 12.9167 7.65915 12.8601 7.37488 12.694C7.09085 12.5281 6.79146 12.2965 6.43848 12.0183L5.97416 12.6073ZM10.0252 12.6073L10.4895 13.1962C11.4258 12.4582 12.6692 11.5788 13.6421 10.4832C14.6408 9.35867 15.4163 7.94644 15.4163 6.0914H14.6663H13.9163C13.9163 7.47831 13.3521 8.55085 12.5206 9.48717C11.6633 10.4524 10.5861 11.21 9.56087 12.0183L10.0252 12.6073ZM14.6663 6.0914H15.4163C15.4163 4.18982 14.34 2.53035 12.7698 1.8126C11.1523 1.07324 9.1512 1.38917 7.45931 3.14699L7.99967 3.66709L8.54004 4.18719C9.84804 2.82823 11.1803 2.73533 12.1462 3.17683C13.1593 3.63995 13.9163 4.75102 13.9163 6.0914H14.6663ZM10.0252 12.6073L9.56087 12.0183C9.20789 12.2965 8.9085 12.5281 8.62447 12.694C8.3402 12.8601 8.14261 12.9167 7.99967 12.9167V13.6667V14.4167C8.52341 14.4167 8.99248 14.2163 9.38126 13.9891C9.77027 13.7618 10.1503 13.4636 10.4895 13.1962L10.0252 12.6073Z" fill="currentColor" />
                                    </svg>
                                </Button>
                                <Button
                                    onClick={generatePDF}
                                    disabled={isGeneratingPDF}
                                    className="flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] bg-[#FFF] text-[#FFF] text-[15px] not-italic font-medium leading-[20px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Открыть PDF"
                                >
                                    {isGeneratingPDF ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1C274C]"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M10.6663 4.00004H5.33301C3.44739 4.00004 2.50458 4.00004 1.91879 4.58583C1.33301 5.17161 1.33301 6.11442 1.33301 8.00004C1.33301 9.88566 1.33301 10.8285 1.91879 11.4143C2.2485 11.744 2.6913 11.8881 3.35164 11.9511C3.33299 11.4692 3.333 10.2349 3.33301 9.66673C3.14891 9.66673 2.99967 9.51747 2.99967 9.33337C2.99967 9.14928 3.14891 9.00004 3.33301 9.00004H12.6663C12.8504 9.00004 12.9997 9.14928 12.9997 9.33337C12.9997 9.51747 12.8504 9.66694 12.6663 9.66694C12.6663 10.235 12.6664 11.4693 12.6477 11.9511C13.3081 11.8881 13.7509 11.744 14.0806 11.4143C14.6663 10.8285 14.6663 9.88566 14.6663 8.00004C14.6663 6.11442 14.6663 5.17161 14.0806 4.58583C13.4948 4.00004 12.552 4.00004 10.6663 4.00004ZM5.99967 7.16671C6.27582 7.16671 6.49967 6.94285 6.49967 6.66671C6.49967 6.39057 6.27582 6.16671 5.99967 6.16671H3.99967C3.72353 6.16671 3.49967 6.39057 3.49967 6.66671C3.49967 6.94285 3.72353 7.16671 3.99967 7.16671H5.99967ZM11.333 7.33337C11.7012 7.33337 11.9997 7.0349 11.9997 6.66671C11.9997 6.29852 11.7012 6.00004 11.333 6.00004C10.9648 6.00004 10.6663 6.29852 10.6663 6.66671C10.6663 7.0349 10.9648 7.33337 11.333 7.33337Z" fill="#1C274C" />
                                            <path d="M11.4137 1.91916C10.8279 1.33337 9.88514 1.33337 7.99952 1.33337C6.1139 1.33337 5.17109 1.33337 4.5853 1.91916C4.25706 2.24741 4.11275 2.68775 4.0493 3.34327C4.42213 3.33335 4.83422 3.33336 5.28596 3.33337H10.7134C11.165 3.33336 11.577 3.33335 11.9497 3.34326C11.8863 2.68775 11.742 2.2474 11.4137 1.91916Z" fill="#1C274C" />
                                            <path fillRule="evenodd" clipRule="evenodd" d="M11.9997 9.66671C11.9997 11.5523 11.9997 13.4951 11.4139 14.0809C10.8281 14.6667 9.88529 14.6667 7.99967 14.6667C6.11406 14.6667 5.17125 14.6667 4.58546 14.0809C3.99968 13.4951 3.99968 11.5523 3.99967 9.66671H11.9997ZM10.4997 11.1667C10.4997 11.4429 10.2758 11.6667 9.99967 11.6667H5.99967C5.72353 11.6667 5.49967 11.4429 5.49967 11.1667C5.49967 10.8906 5.72353 10.6667 5.99967 10.6667H9.99967C10.2758 10.6667 10.4997 10.8906 10.4997 11.1667ZM9.16634 13.1667C9.16634 13.4429 8.94248 13.6667 8.66634 13.6667H5.99967C5.72353 13.6667 5.49967 13.4429 5.49967 13.1667C5.49967 12.8906 5.72353 12.6667 5.99967 12.6667H8.66634C8.94248 12.6667 9.16634 12.8906 9.16634 13.1667Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleCopyLink}
                                    className="flex h-[44px] min-w-[44px] min-h-[44px] pl-[13px] pr-[13px] py-[11px] justify-center items-center rounded-[22px] bg-[#FFF] text-[#FFF] text-[15px] not-italic font-medium leading-[20px]"
                                >
                                    {!shareMessage && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M9.30305 3.45565L12.6216 6.40547C13.242 6.95693 13.5522 7.23265 13.6665 7.55824C13.7669 7.84416 13.7669 8.15574 13.6665 8.44166C13.5522 8.76724 13.242 9.04297 12.6216 9.59442L9.30305 12.5442C9.02152 12.7945 8.88076 12.9196 8.76119 12.9241C8.65732 12.928 8.55758 12.8832 8.49148 12.803C8.41539 12.7106 8.41539 12.5223 8.41539 12.1456V10.2857C6.79667 10.2857 5.08696 10.8056 3.83855 11.7285C3.18862 12.2089 2.86364 12.4492 2.73987 12.4397C2.61922 12.4305 2.54265 12.3833 2.48005 12.2798C2.41583 12.1736 2.47255 11.8416 2.586 11.1778C3.32265 6.86699 6.28929 5.71423 8.41539 5.71423V3.85426C8.41539 3.47759 8.41539 3.28925 8.49148 3.19691C8.55758 3.1167 8.65732 3.07191 8.76119 3.0758C8.88076 3.08027 9.02152 3.2054 9.30305 3.45565Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                    {shareMessage && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z" fill="#1C274C" />
                                        </svg>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex w-full lg:max-w-[463px] p-[32px] flex-col items-start flex-shrink-0 self-start rounded-[32px] bg-[#F4F6FB]">
                        <div className="flex w-full h-full flex-col items-start gap-[16px]">
                            <div className="flex w-full lg:lg:max-w-[463px] h-[66px] flex-col items-start gap-[8px] flex-shrink-0">
                                <h1 className="text-[#282D3C] text-[32px] not-italic font-medium leading-[41.76px]">
                                    {flat.title}
                                </h1>
                                <p className="text-[#132C5E] text-[16px] not-italic font-normal leading-[100%]">
                                    {flat.address}
                                </p>
                            </div>
                            <div className="w-full lg:max-w-[463px] h-[2px] flex-shrink-0 bg-black opacity-10 my-[16px]"></div>
                            {hasActiveDeal === true ? (
                                <div className="flex flex-row gap-2 self-stretch p-4 rounded-2xl bg-zinc-200 border border-zinc-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 36 36" fill="none">
                                        <path d="M18 19.875C18.6213 19.875 19.125 20.3787 19.125 21V27C19.125 27.6213 18.6213 28.125 18 28.125C17.3787 28.125 16.875 27.6213 16.875 27V21C16.875 20.3787 17.3787 19.875 18 19.875Z" fill="#52525B" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M7.875 13.9542V12C7.875 6.40812 12.4081 1.875 18 1.875C23.5919 1.875 28.125 6.40812 28.125 12V13.9542C28.4653 13.9781 28.7859 14.0092 29.0876 14.0498C30.4378 14.2313 31.5746 14.6196 32.4775 15.5225C33.3804 16.4254 33.7687 17.5622 33.9502 18.9124C34.1251 20.2128 34.125 21.8663 34.125 23.9177V24.0823C34.125 26.1337 34.1251 27.7872 33.9502 29.0876C33.7687 30.4378 33.3804 31.5746 32.4775 32.4775C31.5746 33.3804 30.4378 33.7687 29.0876 33.9502C27.7872 34.1251 26.1337 34.125 24.0823 34.125H11.9177C9.86631 34.125 8.21283 34.1251 6.91238 33.9502C5.56221 33.7687 4.4254 33.3804 3.52253 32.4775C2.61965 31.5746 2.23131 30.4378 2.04979 29.0876C1.87495 27.7872 1.87497 26.1337 1.875 24.0823V23.9177C1.87497 21.8663 1.87495 20.2128 2.04979 18.9124C2.23131 17.5622 2.61965 16.4254 3.52253 15.5225C4.4254 14.6196 5.56221 14.2313 6.91238 14.0498C7.21407 14.0092 7.53475 13.9781 7.875 13.9542ZM10.125 12C10.125 7.65076 13.6508 4.125 18 4.125C22.3492 4.125 25.875 7.65076 25.875 12V13.8802C25.3147 13.875 24.7176 13.875 24.0823 13.875H11.9177C11.2824 13.875 10.6853 13.875 10.125 13.8802V12ZM7.21218 16.2797C6.11152 16.4277 5.52866 16.6984 5.11352 17.1135C4.69837 17.5287 4.4277 18.1115 4.27972 19.2122C4.12739 20.3452 4.125 21.8469 4.125 24C4.125 26.1531 4.12739 27.6548 4.27972 28.7878C4.4277 29.8885 4.69837 30.4713 5.11352 30.8865C5.52866 31.3016 6.11152 31.5723 7.21218 31.7203C8.34521 31.8726 9.84688 31.875 12 31.875H24C26.1531 31.875 27.6548 31.8726 28.7878 31.7203C29.8885 31.5723 30.4713 31.3016 30.8865 30.8865C31.3016 30.4713 31.5723 29.8885 31.7203 28.7878C31.8726 27.6548 31.875 26.1531 31.875 24C31.875 21.8469 31.8726 20.3452 31.7203 19.2122C31.5723 18.1115 31.3016 17.5287 30.8865 17.1135C30.4713 16.6984 29.8885 16.4277 28.7878 16.2797C27.6548 16.1274 26.1531 16.125 24 16.125H12C9.84688 16.125 8.34521 16.1274 7.21218 16.2797Z" fill="#52525B" />
                                    </svg>
                                    <p className="text-zinc-700 text-base font-medium">{t("deal_exists_for_this_flat")}</p>
                                </div>
                            ) : (
                                <div className="flex w-full lg:max-w-[463px] flex-col items-start gap-[16px]">
                                    <div className="flex items-center gap-[24px] self-stretch">
                                        <h1 className="flex-[1_0_0] text-[#282D3C] text-[24px] not-italic font-medium leading-[32px]">{flat.room} {t("rooms_count")}</h1>
                                        <span className="text-[#282D3C] text-right text-[24px] not-italic font-normal leading-[32px]">{flat.area}</span>
                                    </div>
                                    <div className="flex flex-col items-start gap-[12px] self-stretch">
                                        <div className="flex items-end gap-[8px] self-stretch flex-wrap">
                                            <h1 className="text-[#282D3C] text-[24px] not-italic font-medium leading-[24px]">
                                                {displayPriceForPayment.main}
                                            </h1>
                                            {displayPriceForPayment.crossedOut && (
                                                <span className="text-[#1A3C7E] text-[20px] not-italic font-medium leading-[normal] [text-decoration-line:line-through] opacity-50">
                                                    {displayPriceForPayment.crossedOut}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-[#1A3C7E] text-[20px] not-italic font-medium leading-[24px] opacity-80">
                                            {displayPriceForPayment.priceM2}
                                        </h2>
                                        {displayPriceForPayment.crossedOut && (
                                            <div className="self-stretch inline-flex justify-start items-start gap-3">
                                                <div className="px-2.5 py-1.5 bg-orange-600 rounded-[32px] flex justify-center items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                        <path d="M6.52089 2.59384C6.8968 2.27349 7.08476 2.11331 7.28128 2.01938C7.73581 1.80213 8.26421 1.80213 8.71874 2.01938C8.91526 2.11331 9.10321 2.27349 9.47913 2.59384C9.62875 2.72134 9.70355 2.78509 9.78345 2.83864C9.96659 2.96139 10.1723 3.04659 10.3886 3.08929C10.4829 3.10792 10.5809 3.11574 10.7768 3.13137C11.2692 3.17066 11.5154 3.19031 11.7207 3.26285C12.1957 3.43063 12.5694 3.80427 12.7372 4.27929C12.8097 4.48466 12.8294 4.73083 12.8686 5.22317C12.8843 5.41912 12.8921 5.51709 12.9107 5.61145C12.9534 5.82775 13.0386 6.03343 13.1614 6.21657C13.2149 6.29646 13.2787 6.37127 13.4062 6.52089C13.7265 6.8968 13.8867 7.08476 13.9806 7.28128C14.1979 7.73581 14.1979 8.26421 13.9806 8.71874C13.8867 8.91526 13.7265 9.10321 13.4062 9.47913C13.2787 9.62875 13.2149 9.70355 13.1614 9.78345C13.0386 9.96659 12.9534 10.1723 12.9107 10.3886C12.8921 10.4829 12.8843 10.5809 12.8686 10.7768C12.8294 11.2692 12.8097 11.5154 12.7372 11.7207C12.5694 12.1957 12.1957 12.5694 11.7207 12.7372C11.5154 12.8097 11.2692 12.8294 10.7768 12.8686C10.5809 12.8843 10.4829 12.8921 10.3886 12.9107C10.1723 12.9534 9.96659 13.0386 9.78345 13.1614C9.70355 13.2149 9.62875 13.2787 9.47913 13.4062C9.10321 13.7265 8.91526 13.8867 8.71874 13.9806C8.26421 14.1979 7.73581 14.1979 7.28128 13.9806C7.08476 13.8867 6.8968 13.7265 6.52089 13.4062C6.37127 13.2787 6.29646 13.2149 6.21657 13.1614C6.03343 13.0386 5.82775 12.9534 5.61145 12.9107C5.51709 12.8921 5.41912 12.8843 5.22317 12.8686C4.73083 12.8294 4.48466 12.8097 4.27929 12.7372C3.80427 12.5694 3.43063 12.1957 3.26285 11.7207C3.19031 11.5154 3.17066 11.2692 3.13137 10.7768C3.11574 10.5809 3.10792 10.4829 3.08929 10.3886C3.04659 10.1723 2.96139 9.96659 2.83864 9.78345C2.78509 9.70355 2.72134 9.62875 2.59384 9.47913C2.27349 9.10321 2.11331 8.91526 2.01938 8.71874C1.80213 8.26421 1.80213 7.73581 2.01938 7.28128C2.11331 7.08476 2.27349 6.8968 2.59384 6.52089C2.72134 6.37127 2.78509 6.29646 2.83864 6.21657C2.96139 6.03343 3.04659 5.82775 3.08929 5.61145C3.10792 5.51709 3.11574 5.41912 3.13137 5.22317C3.17066 4.73083 3.19031 4.48466 3.26285 4.27929C3.43063 3.80427 3.80427 3.43063 4.27929 3.26285C4.48466 3.19031 4.73083 3.17066 5.22317 3.13137C5.41912 3.11574 5.51709 3.10792 5.61145 3.08929C5.82775 3.04659 6.03343 2.96139 6.21657 2.83864C6.29646 2.78509 6.37127 2.72134 6.52089 2.59384Z" stroke="white" />
                                                        <path d="M6 10L10 6" stroke="white" strokeLinecap="round" />
                                                        <path d="M10.3333 9.66667C10.3333 10.0349 10.0349 10.3333 9.66667 10.3333C9.29848 10.3333 9 10.0349 9 9.66667C9 9.29848 9.29848 9 9.66667 9C10.0349 9 10.3333 9.29848 10.3333 9.66667Z" fill="white" />
                                                        <path d="M6.99984 6.33329C6.99984 6.70148 6.70136 6.99996 6.33317 6.99996C5.96498 6.99996 5.6665 6.70148 5.6665 6.33329C5.6665 5.9651 5.96498 5.66663 6.33317 5.66663C6.70136 5.66663 6.99984 5.9651 6.99984 6.33329Z" fill="white" />
                                                    </svg>
                                                    <div className="justify-center text-white text-sm font-medium font-['Gotham'] leading-4">{t("discount")} {flat.discountPercent ?? 0}%</div>
                                                </div>
                                            </div>
                                        )}
                                        {!canOpenPayModal && (
                                            <>
                                                <div className="w-full lg:max-w-[463px] h-[2px] flex-shrink-0 bg-black opacity-10 my-[16px]"></div>
                                                <Button
                                                    onClick={() => setIsDrawerOpen(true)}
                                                    className={`self-stretch h-12 min-w-12 min-h-12 px-3.5 pt-3.5 pb-4 rounded-2xl inline-flex justify-center items-center bg-[#1A3C7E] text-white`}
                                                >
                                                    <span className="justify-start text-base font-medium leading-5">
                                                        {t("leave_request_flat")}
                                                    </span>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {canOpenPayModal && (
                            <div className="flex w-full lg:max-w-[463px] flex-col items-start gap-[16px]">
                                <div className="w-full lg:max-w-[463px] h-[2px] flex-shrink-0 bg-black opacity-10 my-[16px]"></div>
                                <h1 className="text-[#202028] text-[24px] not-italic font-medium leading-[32px]">
                                    {t("purchase_type")}
                                </h1>
                                <div className="self-stretch inline-flex flex-col justify-start items-start gap-3">
                                    {availablePaymentMethods.includes("full") && (
                                        <Button
                                            data-hover={false}
                                            onClick={() => handleButtonClick("full")}
                                            className={`h-auto self-stretch flex flex-col justify-start items-start gap-2.5 rounded-[16px] ${activeButton === "full" ? "bg-[#1A3C7E]" : "bg-[#FFF]"}`}
                                        >
                                            <div data-description="false" data-percent="false" data-price="false" data-show-info-text="false" data-show-tag="true" data-status="False" data-steps="false" className="self-stretch py-4 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
                                                <div className="self-stretch inline-flex flex-col justify-between items-center gap-[16px]">
                                                    <div className="flex justify-between items-start gap-[8px] self-stretch">
                                                        <div className={`flex justify-between text-[16px] font-medium leading-6 ${activeButton === "full" ? "text-white" : "text-[#1A3C7E]"}`}>{t("full_payment")}</div>
                                                        {flat.discountPercent && (
                                                            <div className="flex justify-end items-center gap-1">
                                                                <div data-property-1="Active" className={`px-3 py-1 rounded-2xl flex justify-center items-center ${activeButton === "full" ? "bg-white" : "bg-[#1A3C7E]"}`}>
                                                                    <div className={`text-center justify-center text-xs font-normal leading-4 ${activeButton === "full" ? "text-[#1A3C7E]" : "text-white"}`}>{flat.discountPercent ?? 0}%</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {activeButton === "full" && (
                                                        <div
                                                            className={`flex p-0 flex-col items-start gap-[12px] self-stretch overflow-hidden transition-all duration-500 ease-in-out ${activeButton === "full" ? "max-h-auto opacity-100 visible pointer-events-auto" : "max-h-0 opacity-0 invisible pointer-events-none"
                                                                }`}>
                                                            <p className="text-[#FFF] text-[14px] opacity-60">
                                                                {t("one_payment_without_overpayment_and_interest")}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Button>
                                    )}
                                    {availablePaymentMethods.includes("installment") && (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleButtonClick("installment")}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleButtonClick("installment"); } }}
                                            className={`h-auto self-stretch flex flex-col justify-start items-start gap-2.5 rounded-[16px] cursor-pointer ${activeButton === "installment" ? "bg-[#1A3C7E]" : "bg-[#FFF]"}`}
                                        >
                                            <div className="self-stretch p-4 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
                                                <div className="self-stretch inline-flex justify-between items-center gap-1">
                                                    <div className={`flex justify-between text-[16px] font-medium leading-6 ${activeButton === "installment" ? "text-white" : "text-[#1A3C7E]"}`}>Рассрочка</div>
                                                    <div className="flex justify-end items-center gap-1">
                                                        <div className={`justify-center text-base font-normal leading-6 ${activeButton === "installment" ? "opacity-0" : "text-[#1A3C7E] opacity-50"}`}>
                                                            {installmentPreview.options.length ? (() => { const pcts = installmentPreview.options.map((o) => parseDownPaymentPercent(o.downPayment)).filter((p: number) => p > 0); return pcts.length ? `от ${Math.min(...pcts)}%` : "от 30%"; })() : "от 30%"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {activeButton === "installment" && (
                                                    <div
                                                        className={`w-full flex flex-col items-start gap-[24px] overflow-x-auto overflox-y-hidden scrollbar-hide transition-all duration-500 ease-in-out ${activeButton === "installment" ? "max-h-auto opacity-100 visible pointer-events-auto" : "max-h-0 opacity-0 invisible pointer-events-none"
                                                            }`}>
                                                        <span className="text-[#FFF] text-[16px]">
                                                            {installmentPreview.validToFormatted ? `${t("installment_until")} ${installmentPreview.validToFormatted}` : t("installment_available")}
                                                        </span>

                                                        <div className="flex flex-col items-start gap-[12px]">
                                                            <p className="text-[#FFF] text-[14px] not-italic font-normal leading-[14px] opacity-60">
                                                                {t("select_initial_payment_amount")}
                                                            </p>
                                                            <div className="flex items-start gap-[8px] flex-wrap">
                                                                {installmentPreview.options.length ? installmentPreview.options.map((opt, i) => {
                                                                    const label = `${parseDownPaymentPercent(opt.downPayment)}%`;
                                                                    const isSelected = selectedInstallmentPvIndex === i;
                                                                    return (
                                                                        <button
                                                                            key={i}
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedInstallmentPvIndex(i); }}
                                                                            className={`flex px-[10px] py-[4px] rounded-[32px] text-[16px] leading-[24px] font-normal transition-colors ${isSelected ? "bg-[#2655AF] text-white" : "bg-[#FFF] text-[#2655AF]"}`}
                                                                        >
                                                                            {label}
                                                                        </button>
                                                                    );
                                                                }) : (
                                                                    <>
                                                                        {[30, 50, 70].map((pct, i) => (
                                                                            <button
                                                                                key={pct}
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedInstallmentPvIndex(i); }}
                                                                                className={`flex px-[10px] py-[4px] rounded-[32px] text-[16px] leading-[24px] font-normal transition-colors ${selectedInstallmentPvIndex === i ? "bg-[#2655AF] text-white" : "bg-[#FFF] text-[#2655AF]"}`}
                                                                            >
                                                                                {pct}%
                                                                            </button>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-[10px] w-full">
                                                            <div className="flex h-[96px] flex-col items-start gap-[8px] flex-[1_0_0]">
                                                                <div className="w-full h-[8px] rounded-[32px] bg-[#FFF]"></div>
                                                                <div className="flex h-[80px] flex-col justify-between items-start self-stretch">
                                                                    <p className="self-stretch text-[#FFF] text-[14px] leading-[16px] opacity-70 min-w-[0]">
                                                                        {t("initial_payment")} {installmentPreview.firstDownPct}%
                                                                    </p>
                                                                    <span className="text-[#FFF] text-[14px] font-medium leading-[16px]">{formatPriceDisplay(installmentPreview.firstDown)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex h-[96px] flex-col items-start gap-[8px] flex-[1_0_0]">
                                                                <div className="w-full h-[8px] rounded-[32px] bg-[#FFF] opacity-70"></div>
                                                                <div className="flex h-[80px] flex-col justify-between items-start self-stretch">
                                                                    <p className="self-stretch text-[#FFF] text-[14px] leading-[16px] opacity-70 min-w-[0]">{t("monthly_payment_until")}{installmentPreview.validToFormatted || "даты"}</p>
                                                                    <span className="text-[#FFF] text-[14px] font-medium leading-[16px]">{formatPriceDisplay(installmentPreview.monthlyPayment)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {availablePaymentMethods.includes("deffered") && (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleButtonClick("deffered")}
                                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleButtonClick("deffered"); } }}
                                            className={`h-auto self-stretch flex flex-col justify-start items-start gap-2.5 rounded-[16px] cursor-pointer ${activeButton === "deffered" ? "bg-[#1A3C7E]" : "bg-[#FFF]"}`}
                                        >
                                            <div className="self-stretch p-4 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
                                                <div className="self-stretch inline-flex justify-between items-center gap-1">
                                                    <div className={`flex justify-between text-[16px] font-medium leading-6 ${activeButton === "deffered" ? "text-white" : "text-[#1A3C7E]"}`}>{t("deffered")}</div>
                                                    <div className="flex justify-end items-center gap-1">
                                                        <div className={`justify-center text-base font-normal leading-6 ${activeButton === "deffered" ? "hidden" : "opacity-50 text-[#1A3C7E]"}`}>
                                                            {defferedPreview.options.length ? (() => { const pcts = defferedPreview.options.map((o) => parseDownPaymentPercent(o.downPayment)).filter((p) => p > 0); return pcts.length ? `от ${Math.min(...pcts)}%` : "от 30%"; })() : "от 30%"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {activeButton === "deffered" && (
                                                    <div
                                                        className={`w-full flex flex-col items-start gap-[24px] overflow-x-auto overflox-y-hidden scrollbar-hide transition-all duration-500 ease-in-out ${activeButton === "deffered" ? "max-h-auto opacity-100 visible pointer-events-auto" : "max-h-0 opacity-0 invisible pointer-events-none"
                                                            }`}>
                                                        <span className="text-[#FFF] text-[16px]">
                                                            {t("remainder_of_payment_until")} {defferedPreview.validToFormatted || "даты"}
                                                        </span>

                                                        <div className="flex flex-col items-start gap-[12px]">
                                                            <p className="text-[#FFF] text-[14px] not-italic font-normal leading-[14px] opacity-60">
                                                                {t("select_initial_payment_amount")}
                                                            </p>
                                                            <div className="flex items-start gap-[8px] flex-wrap">
                                                                {defferedPreview.options.length ? defferedPreview.options.map((opt, i) => {
                                                                    const label = `${parseDownPaymentPercent(opt.downPayment)}%`;
                                                                    const isSelected = selectedDefferedPvIndex === i;
                                                                    return (
                                                                        <button
                                                                            key={i}
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); setSelectedDefferedPvIndex(i); }}
                                                                            className={`flex px-[10px] py-[4px] rounded-[32px] text-[16px] leading-[24px] font-normal transition-colors ${isSelected ? "bg-[#2655AF] text-white" : "bg-[#FFF] text-[#2655AF]"}`}
                                                                        >
                                                                            {label}
                                                                        </button>
                                                                    );
                                                                }) : (
                                                                    <>
                                                                        {[30, 50, 70].map((pct, i) => (
                                                                            <button
                                                                                key={pct}
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setSelectedDefferedPvIndex(i); }}
                                                                                className={`flex px-[10px] py-[4px] rounded-[32px] text-[16px] leading-[24px] font-normal transition-colors ${selectedDefferedPvIndex === i ? "bg-[#2655AF] text-white" : "bg-[#FFF] text-[#2655AF]"}`}
                                                                            >
                                                                                {pct}%
                                                                            </button>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-[10px] w-full">
                                                            <div className="flex h-[96px] flex-col items-start gap-[8px] flex-[1_0_0]">
                                                                <div className="w-full h-[8px] rounded-[32px] bg-[#FFF]"></div>
                                                                <div className="flex h-[80px] flex-col justify-between items-start self-stretch">
                                                                    <p className="self-stretch text-[#FFF] text-[14px] leading-[16px] opacity-70 min-w-[0]">
                                                                        {t("initial_payment")} {defferedPreview.firstDownPct}%
                                                                    </p>
                                                                    <span className="text-[#FFF] text-[14px] font-medium leading-[16px]">{formatPriceDisplay(defferedPreview.firstDown)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex h-[96px] flex-col items-start gap-[8px] flex-[1_0_0]">
                                                                <div className="w-full h-[8px] rounded-[32px] bg-[#FFF] opacity-70"></div>
                                                                <div className="flex h-[80px] flex-col justify-between items-start self-stretch">
                                                                    <p className="self-stretch text-[#FFF] text-[14px] leading-[16px] opacity-70 min-w-[0]">
                                                                        {t("remainder_of_payment")} {defferedPreview.validToFormatted || "даты"}
                                                                    </p>
                                                                    <span className="text-[#FFF] text-[14px] font-medium leading-[16px]">{formatPriceDisplay(defferedPreview.remainder)}</span>
                                                                </div>
                                                            </div>

                                                        </div>

                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* {availablePaymentMethods.includes("hypothec") && (
                                <Button
                                    data-hover={false}
                                    onClick={() => handleButtonClick("hypothec")}
                                    className={`h-auto self-stretch flex flex-col justify-start items-start gap-2.5 rounded-[16px] ${activeButton === "hypothec" ? "bg-[#1A3C7E]" : "bg-[#FFF]"}`}
                                >
                                    <div data-description="false" data-percent="false" data-price="false" data-show-info-text="true" data-show-tag="false" data-status="False" data-steps="false" className="self-stretch p-4 rounded-2xl flex flex-col justify-start items-start gap-2.5 overflow-hidden">
                                        <div className="self-stretch inline-flex justify-between items-center gap-1">
                                            <div className={`flex justify-between text-[16px] font-medium leading-6 ${activeButton === "hypothec" ? "text-white" : "text-[#1A3C7E]"}`}>Ипотека</div>
                                            <div className="flex justify-end items-center gap-1">
                                                <div className={`justify-center text-base font-normal leading-6 ${activeButton === "hypothec" ? "text-white" : "opacity-50 text-[#1A3C7E]"}`}>от 643 245 ₸</div>
                                            </div>
                                        </div>
                                        {activeButton === "hypothec" && (
                                            <div
                                                className={`w-full flex flex-col items-start gap-[24px] overflow-x-auto overflox-y-hidden scrollbar-hide transition-all duration-500 ease-in-out ${activeButton === "hypothec" ? "max-h-auto opacity-100 visible pointer-events-auto" : "max-h-0 opacity-0 invisible pointer-events-none"
                                                    }`}>
                                                <span className="text-[#FFF] text-[16px]">
                                                    Ипотека от 15.5%
                                                </span>
                                                <p className="text-[#FFF] text-[14px] not-italic font-normal leading-[14px] opacity-60">
                                                    Срок от 3 месяцев с возрастающей ставкой
                                                </p>

                                                <div className="flex flex-col items-start gap-[8px] w-full">
                                                    <span className="text-[#FFF] text-[14px] not-italic font-normal leading-[14px]">
                                                        Цена в ипотеку:
                                                    </span>

                                                    <h1 className="text-[#FFF] text-[24px] not-italic font-medium leading-[24px]">
                                                        от 643 245 ₸/мес
                                                    </h1>

                                                    <p className="text-[#FFF] text-[14px] not-italic font-normal leading-[14px] opacity-50">
                                                        Полная стоимость: от 56 345 424 ₸
                                                    </p>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                </Button>
                                )} */}
                                </div>
                                {resumeDealId && (
                                    <div className="self-stretch p-3 rounded-2xl bg-[#E8EEF7] border border-[#1A3C7E]/20 flex flex-col gap-2">
                                        <p className="text-[#122C5E] text-sm">
                                            У вас есть договор по этой квартире. Продолжить подписание или проверить статус?
                                        </p>
                                        <Button
                                            onPress={() => {
                                                if (originalFlat && resumeDealId) {
                                                    dispatch(openPay({
                                                        flat: originalFlat,
                                                        paymentMethod: "full",
                                                        step: "sign",
                                                        dealDocumentId: resumeDealId,
                                                    }));
                                                }
                                            }}
                                            className="self-start bg-[#1A3C7E] text-white"
                                        >
                                            Продолжить подписание
                                        </Button>
                                    </div>
                                )}
                                {payStartError && (
                                    <p className="text-red-600 text-sm">{payStartError}</p>
                                )}
                                <Button
                                    onClick={handleOpenPayModal}
                                    isLoading={payStartLoading}
                                    disabled={!activeButton || payStartLoading}
                                    className={`self-stretch h-12 min-w-12 min-h-12 px-3.5 pt-3.5 pb-4 rounded-2xl inline-flex justify-center items-center ${!activeButton
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : "bg-[#1A3C7E] text-white"
                                        }`}
                                >
                                    <span className="justify-start text-base font-medium leading-5">
                                        {t("next")}
                                    </span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="wrapper py-[32px]">
                    <div className="w-full lg:max-w-[821px] p-8 bg-slate-100 rounded-[32px] inline-flex flex-col justify-start items-start gap-4 overflow-hidden">
                        <div className="self-stretch justify-center text-color-blue-14 text-2xl font-medium leading-8">{t("all_characteristics")}</div>
                        <div className="self-stretch flex flex-col justify-start items-start gap-1">
                            {flat.title && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("residential_complex")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.title}</div>
                                </div>
                            )}
                            {flat.complexDueDate && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("due_date")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{formatComplexDueDate(flat.complexDueDate)}</div>
                                </div>
                            )}
                            {flat.complexClass && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("class")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.complexClass}</div>
                                </div>
                            )}
                            {flat.address && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("gen_plan_addres")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.address}</div>
                                </div>
                            )}
                            {flat.section && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("section")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.section}</div>
                                </div>
                            )}
                            {flat.entrance && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("entrance")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.entrance}</div>
                                </div>
                            )}
                            {flat.floor && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("floor")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.floor}</div>
                                </div>
                            )}
                            {flat.apartmentNumber && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("apartment_number")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.apartmentNumber ?? flat.id}</div>
                                </div>
                            )}
                            {flat.area && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("total_area")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.area}</div>
                                </div>
                            )}
                            {flat.sunshine && (
                                <div className="self-stretch border-b border-black/10 inline-flex justify-between items-center overflow-hidden">
                                    <div className="justify-start text-color-blue-14 text-base font-normal leading-8">{t("sunshine")}</div>
                                    <div className="text-right justify-start text-color-blue-14 text-base font-normal leading-8">{flat.sunshine}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <LeaveRequestDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
                {/* Hidden PDF Layout (must be inside return) */}
                <div ref={pdfRef} className="pdf-safe-root fixed left-0 top-0 -z-10 opacity-0 pointer-events-none" style={{ width: 794, background: "white" }}>
                    <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center border-b border-black/10 p-6 gap-6">
                            <img src="/img/Logo.svg" alt="PDF Logo" width={200} height={200} />
                            <div className="flex flex-row gap-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-black text-sm font-normal leading-6 opacity-50">Телефон</span>
                                    <span className="text-black text-md font-normal leading-6">+7 (700) 108‒57‒57</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-black text-sm font-normal leading-6 opacity-50">Сайт</span>
                                    <span className="text-black text-md font-normal leading-6">galamat.kz</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 w-full">
                            <div className="flex w-full border-b border-black/10 p-4">
                                <div className="w-full flex items-center justify-center">
                                    {flat.images?.[0] ? (
                                        <img
                                            src={flat.images[0]}
                                            alt="Планировка"
                                            className="max-w-[360px] w-full h-[240px] object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="w-full h-[240px] flex items-center justify-center bg-black/5 rounded-lg text-black/40 text-sm">Планировка не загружена</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 boderd-l w-full px-8 py-8">
                                <div className="flex pb-4">
                                    <span className="text-black text-[24px] font-bold leading-6">{flat.room}-комнатная {flat.area}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Жилой комплекс</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.title}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Секция</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.section}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Класс</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.complexClass}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Этаж</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.floor}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Площадь</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.area}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black text-base font-normal leading-6">Солнечность</span>
                                    <span className="text-black text-base font-normal leading-6">{flat.sunshine}</span>
                                </div>
                                <div className="flex flex-col gap-2 pt-4">
                                    <span className="text-black text-base font-normal leading-6">Стоимость</span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-black text-[26px] font-bold leading-6">{flat.price}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 border-t border-black/10 p-6">
                            {flat.images?.[1] && (
                                <div className="flex items-center justify-center flex-col gap-2 w-1/2">
                                    <span className="text-black text-base font-normal leading-6">Этаж</span>
                                    <img src={flat.images[1]} alt="План этажа" className="max-w-[320px] w-full h-[160px] object-contain" crossOrigin="anonymous" />
                                </div>
                            )}
                            {flat.complexGenPlanImage && (
                                <div className="flex items-center justify-center flex-col gap-2 w-1/2">
                                    <span className="text-black text-base font-normal leading-6">Генплан</span>
                                    <img src={flat.complexGenPlanImage} alt="Генплан" className="max-w-[320px] w-full h-[160px] object-contain rounded-[24px]" crossOrigin="anonymous" />
                                </div>
                            )}
                        </div>

                        {installmentTableData.length > 0 && (
                            <div className="mt-8">
                                <table className="w-full border-collapse text-[10px]">
                                    <thead>
                                        <tr>
                                            <th className="border border-black/20 px-2 py-1 text-left align-middle bg-[#F5F5F5]">Рассрочка</th>
                                            {installmentTableData.map((col, idx) => (
                                                <th key={idx} className="border border-black/20 px-2 py-1 text-center align-middle text-[#8B0000] font-semibold">
                                                    {col.label}%
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-black/20 px-2 py-1 text-left font-semibold">Стоимость</td>
                                            {installmentTableData.map((col, idx) => (
                                                <td key={idx} className="border border-black/20 px-2 py-1 text-center">
                                                    {formatPriceDisplay(col.cost)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-black/20 px-2 py-1 text-left font-semibold">Цена за кв.м.</td>
                                            {installmentTableData.map((col, idx) => (
                                                <td key={idx} className="border border-black/20 px-2 py-1 text-center">
                                                    {col.pricePerM2 ? `${formatPriceDisplay(col.pricePerM2)}/м²` : "—"}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-black/20 px-2 py-1 text-left font-semibold">Перв. взнос</td>
                                            {installmentTableData.map((col, idx) => (
                                                <td key={idx} className="border border-black/20 px-2 py-1 text-center">
                                                    {formatPriceDisplay(col.firstPayment)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="border border-black/20 px-2 py-1 text-left font-semibold">Остаток</td>
                                            {installmentTableData.map((col, idx) => (
                                                <td key={idx} className="border border-black/20 px-2 py-1 text-center">
                                                    {formatPriceDisplay(col.remainder)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}