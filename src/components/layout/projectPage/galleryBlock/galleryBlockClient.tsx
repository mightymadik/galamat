"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalBody } from "@heroui/react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    ProjectGenPlanGalleryItem,
    ProjectComplexGalleryData,
    ProjectGalleryCategoryKey,
    GALLERY_CATEGORY_KEYS,
} from "@/types/projectPage";

const PROJECT_GALLERY_STAGE_CLASS =
    "h-[min(65svh,800px)] min-h-[220px] max-h-[800px] w-full overflow-hidden";

function ProjectGalleryMedia({
    item,
    onImageClick,
    openFullAriaLabel,
}: {
    item: ProjectGenPlanGalleryItem;
    onImageClick?: () => void;
    openFullAriaLabel?: string;
}) {
    if (item.mime.startsWith("video/")) {
        return (
            <video
                src={item.url}
                controls
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
            />
        );
    }
    if (item.mime.startsWith("audio/")) {
        return (
            <div className="absolute inset-0 flex items-end justify-center bg-black/40 pb-6">
                <audio src={item.url} controls className="w-[min(100%,480px)]" />
            </div>
        );
    }
    if (item.mime.startsWith("image/")) {
        const img = (
            <Image
                src={item.url}
                alt=""
                aria-hidden
                fill
                className="object-cover pointer-events-none"
                unoptimized
                sizes="100vw"
            />
        );
        if (onImageClick) {
            return (
                <button
                    type="button"
                    className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
                    onClick={onImageClick}
                    aria-label={openFullAriaLabel ?? "Open full size"}
                >
                    {img}
                </button>
            );
        }
        return (
            <Image
                src={item.url}
                alt={item.alt}
                fill
                className="object-cover"
                unoptimized
                sizes="100vw"
            />
        );
    }
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-[#ECF0F8] px-4 text-center text-[#132C5E] text-[14px] font-medium underline"
        >
            {item.alt}
        </a>
    );
}

const projectGallerySlideVariants = {
    enter: (direction: number) => ({
        x: direction * 56,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction * -56,
        opacity: 0,
    }),
};

function ProjectGallerySlider({ items }: { items: ProjectGenPlanGalleryItem[] }) {
    const t = useTranslations();
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const lightboxTouchX = useRef<number | null>(null);
    const itemsKey = items.map((i) => i.url).join("|");

    useEffect(() => {
        setIndex(0);
        setDirection(0);
        setLightboxOpen(false);
    }, [itemsKey]);

    const lightboxGo = (delta: number) => {
        if (items.length === 0) return;
        setLightboxIndex((i) => (i + delta + items.length) % items.length);
    };

    const openLightboxAt = (slideIndex: number) => {
        setLightboxIndex(slideIndex);
        setLightboxOpen(true);
    };

    useEffect(() => {
        if (!lightboxOpen || items.length < 2) return;
        const len = items.length;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                setLightboxIndex((i) => (i - 1 + len) % len);
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                setLightboxIndex((i) => (i + 1) % len);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightboxOpen, items.length, itemsKey]);

    const go = (delta: number) => {
        setDirection(delta > 0 ? 1 : -1);
        setIndex((i) => (i + delta + items.length) % items.length);
    };

    const jumpTo = (i: number) => {
        if (i === index) return;
        const forward = (i - index + items.length) % items.length;
        const backward = (index - i + items.length) % items.length;
        setDirection(forward <= backward ? 1 : -1);
        setIndex(i);
    };

    useEffect(() => {
        if (items.length < 2 || lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [items.length, itemsKey, lightboxOpen]);

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current == null || items.length < 2) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 48) return;
        if (dx > 0) go(-1);
        else go(1);
    };

    if (items.length === 0) return null;

    const item = items[index];

    return (
        <div className="relative w-full select-none">
            <div
                className={`relative rounded-[0px] lg:rounded-[32px] bg-black ${PROJECT_GALLERY_STAGE_CLASS}`}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={`${index}-${items[index].url}`}
                        custom={direction}
                        variants={projectGallerySlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            duration: 0.38,
                            ease: [0.25, 0.1, 0.25, 1],
                        }}
                        className="absolute inset-0"
                    >
                        <ProjectGalleryMedia
                            item={item}
                            onImageClick={() => openLightboxAt(index)}
                            openFullAriaLabel={t("gallery_open_full")}
                        />
                    </motion.div>
                </AnimatePresence>

                {items.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Previous slide"
                            onClick={() => go(-1)}
                            className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#132C5E] shadow-md ring-1 ring-black/5 transition hover:bg-white md:left-2 md:h-11 md:w-11"
                        >
                            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            aria-label="Next slide"
                            onClick={() => go(1)}
                            className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#132C5E] shadow-md ring-1 ring-black/5 transition hover:bg-white md:right-2 md:h-11 md:w-11"
                        >
                            <ChevronRight className="h-6 w-6" strokeWidth={2} />
                        </button>
                    </>
                )}
            </div>

            {items.length > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                    {items.map((_, i) => (
                        <button
                            key={`dot-${i}`}
                            type="button"
                            aria-label={`Slide ${i + 1}`}
                            aria-current={i === index}
                            onClick={() => jumpTo(i)}
                            className={`h-2 rounded-full transition-all duration-200 ${
                                i === index ? "w-6 bg-[#132C5E]" : "w-2 bg-[#132C5E]/25 hover:bg-[#132C5E]/40"
                            }`}
                        />
                    ))}
                </div>
            )}

            <Modal
                isOpen={lightboxOpen}
                onOpenChange={(open) => {
                    setLightboxOpen(open);
                }}
                size="full"
                backdrop="blur"
                scrollBehavior="inside"
                classNames={{
                    wrapper: "z-[100]",
                    base: "m-0 h-full max-h-full rounded-none bg-transparent shadow-none",
                    backdrop: "bg-black/85",
                    body: "p-4 sm:p-8",
                    closeButton: "text-white top-3 end-3 z-50 bg-white/10 hover:bg-white/20",
                }}
            >
                <ModalContent>
                    {() => {
                        const lb = items[lightboxIndex];
                        return (
                            <ModalBody className="relative flex min-h-[calc(100dvh-2rem)] items-center justify-center overflow-y-auto p-4 sm:p-8">
                                {lb && (
                                    <div
                                        className="relative flex w-full max-w-[100vw] flex-col items-center justify-center gap-4"
                                        onTouchStart={(e) => {
                                            lightboxTouchX.current = e.touches[0].clientX;
                                        }}
                                        onTouchEnd={(e) => {
                                            if (lightboxTouchX.current == null || items.length < 2) return;
                                            const dx = e.changedTouches[0].clientX - lightboxTouchX.current;
                                            lightboxTouchX.current = null;
                                            if (Math.abs(dx) < 56) return;
                                            if (dx > 0) lightboxGo(-1);
                                            else lightboxGo(1);
                                        }}
                                    >
                                        {lb.mime.startsWith("image/") && (
                                            <Image
                                                key={`${lightboxIndex}-${lb.url}`}
                                                src={lb.url}
                                                alt={lb.alt}
                                                width={2560}
                                                height={1440}
                                                className="max-h-[calc(100dvh-6rem)] w-auto max-w-full h-auto object-contain"
                                                unoptimized
                                            />
                                        )}
                                        {lb.mime.startsWith("video/") && (
                                            <video
                                                key={`${lightboxIndex}-${lb.url}`}
                                                src={lb.url}
                                                controls
                                                playsInline
                                                className="max-h-[calc(100dvh-6rem)] w-full max-w-[min(100vw,1200px)] object-contain"
                                            />
                                        )}
                                        {!lb.mime.startsWith("image/") && !lb.mime.startsWith("video/") && (
                                            <a
                                                href={lb.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-white underline"
                                            >
                                                {lb.alt}
                                            </a>
                                        )}
                                        {items.length > 1 && (
                                            <>
                                                <button
                                                    type="button"
                                                    aria-label={t("gallery_lightbox_prev")}
                                                    onClick={() => lightboxGo(-1)}
                                                    className="absolute left-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25 md:left-4 md:h-14 md:w-14"
                                                >
                                                    <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={t("gallery_lightbox_next")}
                                                    onClick={() => lightboxGo(1)}
                                                    className="absolute right-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25 md:right-4 md:h-14 md:w-14"
                                                >
                                                    <ChevronRight className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2} />
                                                </button>
                                                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[13px] font-medium text-white/95">
                                                    {lightboxIndex + 1} / {items.length}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                        );
                    }}
                </ModalContent>
            </Modal>
        </div>
    );
}

export default function GalleryBlockClient({ gallery }: { gallery: ProjectComplexGalleryData }) {
    const t = useTranslations();

    const categoriesWithItems = useMemo(
        () => GALLERY_CATEGORY_KEYS.filter((k) => gallery[k].length > 0),
        [gallery]
    );

    const [activeCategory, setActiveCategory] = useState<ProjectGalleryCategoryKey>(() => {
        const first = GALLERY_CATEGORY_KEYS.find((k) => gallery[k].length > 0);
        return first ?? "yard";
    });

    const gallerySig = useMemo(
        () => GALLERY_CATEGORY_KEYS.map((k) => gallery[k].map((i) => i.url).join(",")).join("|"),
        [gallery]
    );

    useEffect(() => {
        const first = GALLERY_CATEGORY_KEYS.find((k) => gallery[k].length > 0);
        if (first) setActiveCategory(first);
    }, [gallerySig]);

    const activeItems = gallery[activeCategory];

    if (categoriesWithItems.length === 0) return null;

    return (
        <div className="py-[40px] lg:py-[64px]">
            <div className="wrapper flex flex-col items-start gap-[32px] self-stretch !px-0 lg:!px-[16px]">
                <div className="px-[16px] lg:px-0 flex items-start gap-[16px] self-stretch flex-col lg:flex-row">
                    <h2 className="text-[#202028] text-[36px] font-medium leading-[100%]">
                        {t("gallery")}
                    </h2>
                    {categoriesWithItems.length > 1 && (
                        <div className="flex flex-row  flex-wrap gap-[8px] w-full">
                            {categoriesWithItems.map((key) => (
                                <Button
                                    key={key}
                                    type="button"
                                    onPress={() => setActiveCategory(key)}
                                    className={`min-h-[44px] rounded-[32px] px-[16px] py-[4px] ${
                                        activeCategory === key
                                            ? "bg-[#132C5E] text-white"
                                            : "bg-[#ECF0F8] text-[#132C5E]"
                                    }`}
                                >
                                    <span className="text-[14px] lg:text-[16px] font-medium leading-[18px]">
                                        {t(`gallery_${key}`)}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-full">
                    <ProjectGallerySlider items={activeItems} />
                </div>
            </div>
        </div>
    );
}
