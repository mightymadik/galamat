"use client";
import "../project.scss";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Button } from '@heroui/button'
import { usePathname } from 'next/navigation';
import { useTranslations } from "next-intl";
import { ProjectDetail } from "@/types/projectCatalog";
import { Map } from "@/types/map";
import MapClient from "@/components/layout/mainPage/map/mapClient";
import { useProjects } from "@/contexts/ProjectsContext";
import { ProjectsGridSkeleton } from "../Parts/projectSkeleton";

interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    isExpired: boolean;
}

export function useCountdown(dateString?: string): Countdown | null {
    const [time, setTime] = useState<Countdown | null>(null);
    const [block, setBlock] = useState(true);
    const [map, setMap] = useState(false);

    useEffect(() => {
        if (!dateString) {
            setTime(null);
            return;
        }

        const target = new Date(dateString).getTime();
        if (isNaN(target)) {
            setTime(null);
            return;
        }

        const update = () => {
            const now = Date.now();
            const diff = target - now;

            if (diff <= 0) {
                setTime({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    isExpired: true,
                });
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
                (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
                (diff % (1000 * 60 * 60)) / (1000 * 60)
            );

            setTime({
                days,
                hours,
                minutes,
                isExpired: false,
            });
        };

        update();
        const interval = setInterval(update, 60_000); // обновляем раз в минуту

        return () => clearInterval(interval);
    }, [dateString]);

    return time;
}

function formatQuarter(date?: string) {
    const t = useTranslations();
    if (!date) return "";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return `${quarter} ${t("quarter")} ${d.getFullYear()}`;
}

export default function MainPageProjectsClient({
    mainPageProjects: initialProjects,
    mapData
}: {
    mainPageProjects: ProjectDetail[];
    mapData: Map[];
}) {
    const { projects, isLoading, hasFiltered } = useProjects();
    const [block, setBlock] = useState(true);
    const [map, setMap] = useState(false);

    const isMainPage = usePathname() === "/";
    const t = useTranslations();

    // Используем проекты из контекста, если фильтрация была применена, иначе начальные
    // Если фильтрация была применена и вернула пустой результат, показываем пустой список
    const displayProjects = hasFiltered ? projects : initialProjects;

    const [activeIndexes, setActiveIndexes] = useState<number[]>(
        displayProjects.map(() => 0)
    );
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    /** Сохраняем скролл до обновления DOM — иначе мобильный браузер после фокуса на кнопке сам прокручивает экран (особенно 2+ карточка). */
    const scrollYBeforeExpandRef = useRef<number | null>(null);

    // Обновляем activeIndexes при изменении проектов
    useEffect(() => {
        setActiveIndexes(displayProjects.map(() => 0));
    }, [displayProjects]);

    useLayoutEffect(() => {
        const y = scrollYBeforeExpandRef.current;
        if (y === null || typeof window === "undefined") return;
        scrollYBeforeExpandRef.current = null;
        const restore = () => window.scrollTo(0, y);
        restore();
        requestAnimationFrame(restore);
        setTimeout(restore, 0);
    }, [expandedIndex]);

    const toggleExpand = useCallback((index: number) => {
        if (typeof window !== "undefined") {
            scrollYBeforeExpandRef.current = window.scrollY;
        }
        setExpandedIndex((prev) => (prev === index ? null : index));
    }, []);

    const handleMouseMove = (
        e: React.MouseEvent<HTMLDivElement>,
        projectIndex: number,
        imagesCount: number
    ) => {
        if (!imagesCount) return;

        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX - rect.left;

        // 🔒 жёстко держим x в пределах блока
        x = Math.max(0, Math.min(x, rect.width - 1));

        const part = rect.width / imagesCount;
        const newIndex = Math.floor(x / part);

        setActiveIndexes((prev) => {
            if (prev[projectIndex] === newIndex) return prev; // ⛔ нет лишних ререндеров

            const copy = [...prev];
            copy[projectIndex] = newIndex;
            return copy;
        });
    };

    function ProjectItem({
        project,
        idx,
        activeIndexes,
        handleMouseMove,
        formatQuarter,
        t,
        expandedIndex,
        toggleExpand,
    }: {
        project: ProjectDetail;
        idx: number;
        activeIndexes: number[];
        handleMouseMove: (e: React.MouseEvent<HTMLDivElement>, projectIndex: number, imagesCount: number) => void;
        formatQuarter: (date?: string) => string;
        t: ReturnType<typeof useTranslations>;
        expandedIndex: number | null;
        toggleExpand: (index: number) => void;
    }) {
        const isExpanded = expandedIndex === idx;
        const countdown = useCountdown(project.complexHeroPrimaryPromoDate);
        const tags = [
            project.complexClass,
            formatQuarter(project.complexDueDate),
            project.complexPaymentMethod,
        ].filter(Boolean);

        return (
            <div
                key={idx}
                className={`projectItem group flex w-full max-w-full flex-col items-start flex-shrink-0 lg:w-auto lg:max-w-none ${isExpanded ? "max-lg:relative max-lg:z-20" : ""}`}
            >
                <Link
                    href={`/project/${project.projectSlug}`}
                    className="flex w-full flex-col items-start flex-[1_0_0] rounded-[32px]"
                >
                    {project.saleStart ? (
                        <div className="h-full min-h-[322px] flex w-full flex-col items-start flex-[1_0_0] rounded-[32px] bg-[#DB1D31]">
                            <div className="flex px-[0] py-[8px] justify-center items-center gap-[8px] self-stretch text-white text-[12px] not-italic font-normal leading-[17.359px]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M1.77409 10.4814C2.07033 10.778 2.07004 11.2586 1.77343 11.5548L1.61779 11.7103C1.48483 11.8431 1.48483 12.058 1.61779 12.1908C1.75125 12.3241 1.96801 12.3241 2.10147 12.1908L3.8136 10.4807C4.1102 10.1845 4.59079 10.1848 4.88704 10.4814C5.18328 10.778 5.18298 11.2586 4.88638 11.5548L3.17426 13.2648C2.4481 13.9901 1.27116 13.9901 0.545 13.2648C-0.181666 12.5391 -0.181667 11.362 0.545 10.6362L0.700647 10.4807C0.99725 10.1845 1.47784 10.1848 1.77409 10.4814ZM6.68665 11.4896C6.98307 11.7861 6.98307 12.2667 6.68665 12.5631L4.54424 14.7055C4.24782 15.0019 3.76723 15.0019 3.4708 14.7055C3.17438 14.409 3.17438 13.9285 3.4708 13.632L5.61321 11.4896C5.90963 11.1932 6.39023 11.1932 6.68665 11.4896ZM9.4958 14.2953C9.79223 14.5918 9.79223 15.0724 9.4958 15.3688L7.36805 17.4965C7.07162 17.7929 6.59103 17.7929 6.29461 17.4965C5.99818 17.2001 5.99818 16.7195 6.29461 16.4231L8.42237 14.2953C8.71879 13.9989 9.19938 13.9963 9.4958 14.2953ZM6.29719 14.696C6.5903 14.9957 6.58495 15.4762 6.28525 15.7693L4.55508 17.4614C4.25538 17.7545 3.77481 17.7491 3.48171 17.4494C3.1886 17.1497 3.19395 16.6692 3.49365 16.3761L5.22382 14.684C5.52352 14.3909 6.00409 14.3963 6.29719 14.696ZM10.4811 16.118C10.7774 16.4146 10.7771 16.8952 10.4805 17.1915L8.76834 18.9015C8.63539 19.0343 8.63539 19.2492 8.76834 19.382C8.9018 19.5153 9.11857 19.5153 9.25203 19.382L9.40768 19.2265C9.70428 18.9303 10.1849 18.9306 10.4811 19.2272C10.7774 19.5238 10.7771 20.0044 10.4805 20.3006L10.3248 20.4561C9.59866 21.1813 8.42171 21.1813 7.69556 20.4561C6.96889 19.7303 6.96889 18.5532 7.69556 17.8274L9.40768 16.1174C9.70428 15.8211 10.1849 15.8214 10.4811 16.118Z" fill="white" />
                                    <path d="M9.84633 3.40912L7.65863 5.59023C7.2565 5.99113 6.88763 6.35888 6.59632 6.69132C6.40925 6.90481 6.2223 7.13847 6.06394 7.39666L6.04262 7.37541C6.00216 7.33507 5.98191 7.31487 5.96159 7.29516C5.58134 6.92621 5.13406 6.63287 4.64368 6.43084C4.61748 6.42004 4.59088 6.4095 4.53769 6.38842L4.21196 6.25936C3.77069 6.08451 3.65309 5.51645 3.98886 5.1817C4.9525 4.22099 6.10949 3.06751 6.66786 2.83584C7.1603 2.63152 7.69225 2.56354 8.20531 2.63936C8.67539 2.70883 9.1201 2.9503 9.84633 3.40912Z" fill="white" />
                                    <path d="M13.5818 14.8932C13.7581 15.0722 13.8752 15.1985 13.981 15.3336C14.1207 15.5118 14.2456 15.7011 14.3544 15.8995C14.4769 16.1229 14.5721 16.3615 14.7623 16.8388C14.9172 17.2273 15.4317 17.33 15.7306 17.032L15.8029 16.9599C16.7665 15.9992 17.9235 14.8457 18.1558 14.289C18.3608 13.7981 18.429 13.2677 18.3529 12.7562C18.2832 12.2876 18.0411 11.8443 17.581 11.1204L15.386 13.3088C14.9748 13.7188 14.5977 14.0948 14.2567 14.3893C14.0523 14.5658 13.8287 14.7422 13.5818 14.8932Z" fill="white" />
                                    <path fillRule="evenodd" clipRule="evenodd" d="M14.5023 12.3674L19.5319 7.35289C20.2563 6.63072 20.6185 6.26963 20.8092 5.81046C21 5.3513 21 4.84065 21 3.81937V3.33146C21 1.76099 21 0.975762 20.5106 0.487881C20.0213 0 19.2337 0 17.6585 0H17.1691C16.1447 0 15.6325 0 15.172 0.190194C14.7114 0.380388 14.3493 0.741471 13.6249 1.46364L8.59522 6.47817C7.74882 7.32202 7.224 7.84526 7.02078 8.35062C6.95657 8.5103 6.92446 8.6682 6.92446 8.83387C6.92446 9.52383 7.48138 10.0791 8.59522 11.1896L8.74492 11.3388L10.4985 9.55907C10.7486 9.30526 11.1571 9.30223 11.4109 9.55232C11.6647 9.8024 11.6678 10.2109 11.4177 10.4647L9.65872 12.2499L9.77663 12.3674C10.8905 13.4779 11.4474 14.0331 12.1394 14.0331C12.2924 14.0331 12.4387 14.006 12.5858 13.9518C13.1048 13.7607 13.6345 13.2325 14.5023 12.3674ZM16.8652 6.47854C16.2127 7.12904 15.1548 7.12904 14.5024 6.47854C13.8499 5.82803 13.8499 4.77335 14.5024 4.12284C15.1548 3.47233 16.2127 3.47233 16.8652 4.12284C17.5177 4.77335 17.5177 5.82803 16.8652 6.47854Z" fill="white" />
                                </svg>
                                {t("sale_date_left")} {countdown?.days} {t("day")} {String(countdown?.hours).padStart(2, "0")} {t("hour")}{" "}
                                {String(countdown?.minutes).padStart(2, "0")} {t("minute")}
                            </div>

                            <div
                                onMouseMove={(e) =>
                                    handleMouseMove(e, idx, project.previewGallery?.length ?? 1)
                                }
                                className="transition-all duration-300 flex p-[20px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[32px] bg-cover bg-center bg-no-repeat"
                                style={{
                                    backgroundImage: `url(${project.previewGallery?.[activeIndexes[idx]]})`,
                                    transition: "background-image 0.4s ease-in-out",
                                }}
                            >

                                <div className="tags flex items-center gap-[6.604px]">
                                    {tags.map((tag, i) => (
                                        <div
                                            key={i}
                                            className="tag flex max-w-[120px] px-[12px] py-[4px] justify-center items-center rounded-[16px] bg-[#F4F5F9] text-[#282D3C] text-center text-[12px] font-normal leading-[17.359px]"
                                        >
                                            {tag}
                                        </div>
                                    ))}
                                </div>

                                <div className="slide flex px-[142px] items-center gap-[8px] justify-center w-full">
                                    {project.previewGallery?.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`sliderDivider w-[28px] h-[2px] rounded-[2px] transition-all duration-300 ${activeIndexes[idx] === i
                                                ? "bg-white opacity-100"
                                                : "bg-white/40 opacity-40"
                                                }`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onMouseMove={(e) =>
                                handleMouseMove(e, idx, project.previewGallery?.length ?? 1)
                            }
                            className="h-full min-h-[322px] transition-all duration-300 flex p-[20px] flex-col justify-between items-start flex-[1_0_0] self-stretch rounded-[32px] bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: `url(${project.previewGallery?.[activeIndexes[idx]]})`,
                                transition: "background-image 0.4s ease-in-out",
                            }}
                        >
                            <div className="tags flex items-center gap-[6.604px]">
                                {tags.map((tag, i) => (
                                    <div
                                        key={i}
                                        className="tag flex max-w-[120px] px-[12px] py-[4px] justify-center items-center rounded-[16px] bg-[#F4F5F9] text-[#282D3C] text-center text-[12px] font-normal leading-[17.359px]"
                                    >
                                        {tag}
                                    </div>
                                ))}
                            </div>

                            <div className="slide flex px-[142px] items-center gap-[8px]">
                                {project.previewGallery?.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`sliderDivider w-[28px] h-[2px] rounded-[2px] transition-all duration-300 ${activeIndexes[idx] === i
                                            ? "bg-white opacity-100"
                                            : "bg-white/40 opacity-40"
                                            }`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    )}
                </Link>

                <Link
                    href={`/project/${project.projectSlug}`}
                    className="projectItemHeadingItem flex w-full flex-col items-start gap-[12px] cursor-pointer transition-all duration-300 group-hover:scale-[1.03]"
                >
                    <div className="flex items-center self-stretch">
                        <div className="flex py-[12px] flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
                            <span className="text-[22.642px] font-[500] leading-[22.64px]">
                                {project.complexName}
                            </span>
                            <span className="text-[13.208px] font-[400] leading-[100%]">
                                {project.complexAddress}
                            </span>
                        </div>
                    </div>
                </Link>

                <button
                    type="button"
                    aria-expanded={isExpanded}
                    className="flex lg:hidden h-[36px] min-w-[36px] px-3 justify-center items-center flex-shrink-0 self-stretch rounded-[12px] bg-[#F4F6FB] gap-2 text-[13px] text-[#282D3C] transition-transform duration-300"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleExpand(idx)}
                >
                    {isExpanded ? t("collapse") : t("expand")}
                    <svg
                        className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                            }`}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                    >
                        <path
                            d="M12.6668 6L8.00016 10L3.3335 6"
                            stroke="#282D3C"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                <div
                    className={[
                        "w-full transition-all duration-500 ease-in-out overflow-hidden",
                        isExpanded
                            ? "max-lg:max-h-[min(55vh,420px)] max-lg:opacity-100 max-lg:mt-2 max-lg:overflow-y-auto max-lg:overscroll-y-contain"
                            : "max-lg:max-h-0 max-lg:opacity-0 max-lg:mt-0 max-lg:overflow-hidden",
                        "lg:overflow-hidden lg:max-h-0 lg:opacity-0 lg:mt-0 lg:group-hover:max-h-[min(70vh,720px)] lg:group-hover:opacity-100 lg:group-hover:mt-2",
                    ].join(" ")}
                    style={{ willChange: "max-height, opacity" }}
                >
                    <svg className="my-[12px]" xmlns="http://www.w3.org/2000/svg" width="415" height="1" viewBox="0 0 415 1" fill="none">
                        <path d="M0 0.5H415" stroke="black" strokeOpacity="0.1" />
                    </svg>

                    <div className="projectItemSubItemContent flex flex-col items-start gap-[8px] self-stretch">
                        <p className="flex gap-[4px] self-stretch text-[#1E1E1E] text-[12px] font-normal leading-[100%]">
                            {project.flatsCount || 0} {t("expand_flats")}
                            <span className="text-[rgba(30,_30,_30,_0.37)]">{t("in_sale")}</span>
                        </p>

                        {project.flats && project.flats.length > 0 ? (
                            <div className="projectItemSubItemContentDetail flex justify-between items-start self-stretch">
                                <div className="projectItemSubRooms flex flex-col items-start gap-[8px]">
                                    {project.flats.map((flat, i) => {
                                        const roomNum = flat.type.match(/(\d+)/)?.[1] ?? String(i + 1);
                                        const flatsUrl = `/flats?project=${encodeURIComponent(project.complexName)}&rooms=${roomNum}`;
                                        return (
                                            <Link key={i} href={flatsUrl} className="leading-4 text-[#3682F5] text-[12px]">
                                                {flat.type}
                                            </Link>
                                        );
                                    })}
                                </div>
                                <div className="projectItemSubAreas flex flex-col items-start gap-[8px]">
                                    {project.flats.map((flat, i) => (
                                        <span key={i} className="text-[#122C5E] text-[12px] opacity-50">
                                            {flat.area}
                                        </span>
                                    ))}
                                </div>
                                <div className="projectItemSubPrices flex flex-col items-end gap-[8px]">
                                    {project.flats.map((flat, i) => (
                                        <span key={i} className="text-[#122C5E] text-[12px]">
                                            {flat.price}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-[#122C5E] text-[12px] opacity-50">{t("no_available_flats")}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4 lg:py-6">
            <div className="wrapper flex flex-col items-start gap-[32px]">
                <div className="flex flex-col md:flex-row w-full gap-4 justify-end">
                    <div className="flex flex-row gap-3">
                        <Button
                            onClick={() => {
                                setBlock(true);
                                setMap(false);
                            }}
                            className={`!rounded-[82px] min-w-[20px] ${block ? 'bg-[#2655af] text-white' : '!bg-[#ECF0F8] text-[#132C5E]'
                                }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
                                <path d="M0 3.825C0 2.02188 0 1.12032 0.560158 0.560158C1.12032 0 2.02188 0 3.825 0C5.62812 0 6.52968 0 7.08984 0.560158C7.65 1.12032 7.65 2.02188 7.65 3.825C7.65 5.62812 7.65 6.52968 7.08984 7.08984C6.52968 7.65 5.62812 7.65 3.825 7.65C2.02188 7.65 1.12032 7.65 0.560158 7.08984C0 6.52968 0 5.62812 0 3.825Z" fill={`${block ? 'white' : '#2655AF'}`} />
                                <path d="M9.35 13.175C9.35 11.3719 9.35 10.4703 9.91016 9.91016C10.4703 9.35 11.3719 9.35 13.175 9.35C14.9781 9.35 15.8797 9.35 16.4398 9.91016C17 10.4703 17 11.3719 17 13.175C17 14.9781 17 15.8797 16.4398 16.4398C15.8797 17 14.9781 17 13.175 17C11.3719 17 10.4703 17 9.91016 16.4398C9.35 15.8797 9.35 14.9781 9.35 13.175Z" fill={`${block ? 'white' : '#2655AF'}`} />
                                <path d="M0 13.175C0 11.3719 0 10.4703 0.560158 9.91016C1.12032 9.35 2.02188 9.35 3.825 9.35C5.62812 9.35 6.52968 9.35 7.08984 9.91016C7.65 10.4703 7.65 11.3719 7.65 13.175C7.65 14.9781 7.65 15.8797 7.08984 16.4398C6.52968 17 5.62812 17 3.825 17C2.02188 17 1.12032 17 0.560158 16.4398C0 15.8797 0 14.9781 0 13.175Z" fill={`${block ? 'white' : '#2655AF'}`} />
                                <path d="M9.35 3.825C9.35 2.02188 9.35 1.12032 9.91016 0.560158C10.4703 0 11.3719 0 13.175 0C14.9781 0 15.8797 0 16.4398 0.560158C17 1.12032 17 2.02188 17 3.825C17 5.62812 17 6.52968 16.4398 7.08984C15.8797 7.65 14.9781 7.65 13.175 7.65C11.3719 7.65 10.4703 7.65 9.91016 7.08984C9.35 6.52968 9.35 5.62812 9.35 3.825Z" fill={`${block ? 'white' : '#2655AF'}`} />
                            </svg>
                        </Button>
                        <Button
                            onClick={() => {
                                setBlock(false);
                                setMap(true);
                            }}
                            className={`rounded-[64px] pr-4 pl-1 ${map ? 'bg-[#2655af] text-white' : 'bg-[#ECF0F8] text-[#132C5E]'
                                }`}>
                            <Image src="/img/map.svg" alt="Map" width={36} height={36} />
                            {t("watch_maps")}
                        </Button>
                    </div>
                </div>
                {block ? (
                    <div className={`flex flex-col lg:grid w-full h-full gap-[32px] lg:grid-rows-1 grid-cols-3 mx-auto ${!isMainPage ? 'pb-20 lg:pb-0' : 'pb-0'}`}>
                        {isLoading ? (
                            <ProjectsGridSkeleton />
                        ) : displayProjects.length > 0 ? (
                            displayProjects.map((project, idx) => (
                                <ProjectItem
                                    key={project.id || idx}
                                    project={project}
                                    idx={idx}
                                    activeIndexes={activeIndexes}
                                    handleMouseMove={handleMouseMove}
                                    formatQuarter={formatQuarter}
                                    t={t}
                                    expandedIndex={expandedIndex}
                                    toggleExpand={toggleExpand}
                                />
                            ))
                        ) : (
                            <div className="col-span-3 flex justify-center items-center py-8">
                                <p>Проекты не найдены</p>
                            </div>
                        )}
                    </div>
                ) : map ? (
                    <div className="w-full lg:h-[600px]">
                        <MapClient mapData={mapData} onModalClose={() => { setBlock(true); setMap(false); }} />
                    </div>
                ) : null}
            </div>
            {
                isMainPage && !map && (
                    <div className="flex pt-[24px] flex-col items-center gap-[9.493px] self-stretch">
                        <Link href="/project">
                            <Button className="flex w-[280px] h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center rounded-[32px] bg-[#F4F5F9] text-[15px] font-medium leading-[20px]">
                                {t("show_more")}
                            </Button>
                        </Link>
                    </div>
                )
            }
        </div >
    );
}