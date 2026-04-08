"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { DateRangePicker, Button } from "@heroui/react";
import { parseDate, type DateValue } from "@internationalized/date";
import type { RootState } from "@/store";
import { useTranslations } from "next-intl";

/** Показатели за период */
type PeriodStats = {
    ticketsByQr: number;
    ticketsByKlm: number;
    avgWaitInQueue: string;
    avgServiceTime: string;
    noShowCount: number;
    topManagerByServed: {
        managerId: string;
        managerName: string | null;
        ticketsServed: number;
    } | null;
};

/** Статус клиента: ключ, количество, процент, цвет процента */
type ClientStatusItem = {
    key: string;
    label: string;
    count: number;
    percent: string;
    percentColor: string;
};

/** Запись в таблице оценок */
type RatingRow = {
    managerId?: string;
    name: string;
    shortName: string;
    ticketsServed?: number;
    ticketsNoShow?: number;
    rating: number;
};

/** Столбец диаграммы: подпись снизу + число сверху (услуги или менеджеры). */
type StatBarItem = {
    key: string;
    label: string;
    value: number;
};

type RatingSummary = {
    total: number;
    avgScore: number;
    distribution: Record<string, number>;
};

const DEFAULT_RANGE = {
    start: parseDate(new Date().toISOString().slice(0, 10)),
    end: parseDate(new Date().toISOString().slice(0, 10)),
};

const RATING_CHART = { width: 908, height: 208, padding: { top: 24, right: 16, bottom: 46, left: 44 } };

/** Строит path для линии графика оценки. values — значения по месяцам (1–10), Y в SVG: 10 сверху, 1 снизу. */
function buildRatingLinePath(values: number[]): string {
  const { width, height, padding } = RATING_CHART;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const minY = 1;
  const maxY = 10;
  if (values.length === 0) return "";
  const points = values.map((v, i) => {
    const x = padding.left + (i / Math.max(1, values.length - 1)) * plotW;
    const y = padding.top + ((maxY - Math.min(maxY, Math.max(minY, v))) / (maxY - minY)) * plotH;
    return `${x},${y}`;
  });
  return `M ${points.join(" L ")}`;
}

/** Вычисляет X/Y точки на графике оценки для одного значения. */
function getRatingPoint(v: number, i: number, total: number): { x: number; y: number } {
  const { width, height, padding } = RATING_CHART;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const x = padding.left + (i / Math.max(1, total - 1)) * plotW;
  const minY = 1;
  const maxY = 10;
  const y = padding.top + ((maxY - Math.min(maxY, Math.max(minY, v))) / (maxY - minY)) * plotH;
  return { x, y };
}

function getRatingBadgeClass(rating: number): { bg: string; text: string } {
    if (rating >= 8) return { bg: "bg-[#D4FBEC]", text: "text-[#0F6D4B]" };
    if (rating >= 6) return { bg: "bg-[#D4FBEC]", text: "text-[#0F6D4B]" };
    if (rating >= 4) return { bg: "bg-[#EFEFF4]", text: "text-[#262842]" };
    return { bg: "bg-[#FAE3E6]", text: "text-[#DB1D31]" };
}

function shortenLabel(value: string, maxLength = 12): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

function roundRating(value: number): number {
    return Math.round(value * 100) / 100;
}

export default function StatsProfile() {
    const t = useTranslations();
    const [dateRange, setDateRange] = useState<{ start: DateValue; end: DateValue }>(DEFAULT_RANGE);
    const [exportLoading, setExportLoading] = useState(false);
    const [stats, setStats] = useState<PeriodStats | null>(null);
    const [statuses, setStatuses] = useState<ClientStatusItem[]>([]);
    const [ratingRows, setRatingRows] = useState<RatingRow[]>([]);
    const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
    const [resolvedBranchId, setResolvedBranchId] = useState("");

    const branchId = useSelector((state: RootState) => state.queueProfile.branchId);

    const selectedDateIso = dateRange.start.toString().slice(0, 10);
    const statusMap = useMemo(() => new Map(statuses.map((status) => [status.key, status])), [statuses]);
    const ratingChartRows = useMemo(() => ratingRows.filter((row) => row.rating > 0), [ratingRows]);
    const ratingChartLabels = useMemo(() => ratingChartRows.map((row) => shortenLabel(row.name)), [ratingChartRows]);
    const ratingChartValues = useMemo(() => ratingChartRows.map((row) => roundRating(row.rating)), [ratingChartRows]);
    /** Топ менеджеров по числу обслуженных клиентов за выбранную дату (из /stats/managers). */
    const managerClientsBarsTop = useMemo((): StatBarItem[] => {
        return [...ratingRows]
            .map((row, index) => ({
                key: row.managerId ?? `${row.name}-${index}`,
                label: row.name,
                value: row.ticketsServed ?? 0,
            }))
            .filter((bar) => bar.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [ratingRows]);

    const maxManagerClientsValue = useMemo(
        () => Math.max(...managerClientsBarsTop.map((item) => item.value), 0),
        [managerClientsBarsTop],
    );

    useEffect(() => {
        if (branchId) {
            setResolvedBranchId(branchId);
            return;
        }

        let cancelled = false;

        async function loadBranchId() {
            try {
                const res = await fetch("/api/queue/manager/me");
                if (!res.ok) return;
                const json = await res.json();
                const nextBranchId = json?.data?.branch?.id;
                if (!cancelled && nextBranchId) {
                    setResolvedBranchId(String(nextBranchId));
                }
            } catch {
                // ignore
            }
        }

        loadBranchId();

        return () => {
            cancelled = true;
        };
    }, [branchId]);

    useEffect(() => {
        if (!resolvedBranchId || !selectedDateIso) return;

        const controller = new AbortController();

        async function loadStats() {
            try {
                const startDateIso = dateRange.start.toString().slice(0, 10);
                const endDateIso = dateRange.end.toString().slice(0, 10);

                const [queueRes, managersRes, ratingsRes] = await Promise.all([
                    fetch(`/api/queue/stats/queue?branchId=${encodeURIComponent(resolvedBranchId)}&date=${encodeURIComponent(selectedDateIso)}`, {
                        signal: controller.signal,
                    }),
                    fetch(`/api/queue/stats/managers?branchId=${encodeURIComponent(resolvedBranchId)}&date=${encodeURIComponent(selectedDateIso)}`, {
                        signal: controller.signal,
                    }),
                    fetch(`/api/queue/stats/ratings?branchId=${encodeURIComponent(resolvedBranchId)}&startDate=${encodeURIComponent(startDateIso)}&endDate=${encodeURIComponent(endDateIso)}`, {
                        signal: controller.signal,
                    }),
                ]);

                if (queueRes.ok) {
                    const json = await queueRes.json();
                    if (json?.stats) setStats(json.stats as PeriodStats);
                    if (Array.isArray(json?.statuses)) setStatuses(json.statuses as ClientStatusItem[]);
                }

                if (managersRes.ok) {
                    const json = await managersRes.json();
                    if (Array.isArray(json?.rows)) setRatingRows(json.rows as RatingRow[]);
                }

                if (ratingsRes.ok) {
                    const json = await ratingsRes.json();
                    if (json?.ratings) setRatingSummary(json.ratings as RatingSummary);
                }
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                // Ошибки тихо игнорируем, на странице останутся мок-данные
            }
        }

        loadStats();

        return () => controller.abort();
    }, [resolvedBranchId, selectedDateIso, dateRange]);

    const handleExportReport = useCallback(async () => {
        if (!resolvedBranchId) {
            return;
        }

        setExportLoading(true);

        try {
            const start = dateRange.start.toString().slice(0, 10);
            const end = dateRange.end.toString().slice(0, 10);
            const qs = new URLSearchParams({
                branchId: resolvedBranchId,
                startDate: start,
                endDate: end,
            }).toString();

            const kinds = ["manager-sessions", "clients"] as const;

            for (const kind of kinds) {
                const res = await fetch(`/api/queue/stats/export/${kind}?${qs}`);

                if (!res.ok) {
                    await res.json().catch(() => undefined);
                    continue;
                }

                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = objectUrl;
                const cd = res.headers.get("Content-Disposition");
                const match = cd?.match(/filename="([^"]+)"/);
                a.download = match?.[1] ?? `${kind}_${start}_${end}.xlsx`;
                a.click();
                URL.revokeObjectURL(objectUrl);
            }
        } finally {
            setExportLoading(false);
        }
    }, [dateRange, resolvedBranchId]);

    return (
        <div className="flex w-full flex-col items-start gap-[32px]">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 self-stretch">
                <div className="flex w-full sm:max-w-[304px] pt-[3.07px] flex-col items-start gap-[8.188px]">
                    <div className="flex items-center">
                    <div className="flex flex-col items-start">
                            <p className="text-[rgba(7,_7,_31,_0.48)] text-[12.282px] not-italic font-normal leading-[16.335px]">
                                {t("stats_period")}
                            </p>
                    </div>
                    </div>
                    <DateRangePicker
                        isRequired
                        value={dateRange}
                        onChange={(v) => v != null && setDateRange(v)}
                        classNames={{
                            base: "w-full",
                            input: "w-full",
                        }}
                    />
                </div>
                <Button
                    variant="bordered"
                    size="sm"
                    isLoading={exportLoading}
                    onPress={handleExportReport}
                    className="flex h-[40px] min-w-[40px] min-h-[40px] pl-[13px] pr-[13px] py-[11px] justify-center items-center gap-[4px] rounded-[12px] !border-[1.5px] !border-solid !border-[#F3F3F3]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <path d="M8.36902 11.0041C8.27429 11.1077 8.14038 11.1667 8 11.1667C7.85962 11.1667 7.72571 11.1077 7.63099 11.0041L4.96432 8.08738C4.77799 7.88358 4.79215 7.56732 4.99595 7.38099C5.19975 7.19465 5.51602 7.20881 5.70235 7.41262L7.5 9.3788V2C7.5 1.72386 7.72386 1.5 8 1.5C8.27614 1.5 8.5 1.72386 8.5 2V9.3788L10.2977 7.41262C10.484 7.20881 10.8003 7.19465 11.0041 7.38099C11.2079 7.56732 11.222 7.88358 11.0357 8.08738L8.36902 11.0041Z" fill="#1C274C" />
                        <path d="M2.5 10C2.5 9.72386 2.27614 9.5 2 9.5C1.72386 9.5 1.5 9.72386 1.5 10V10.0366C1.49999 10.9483 1.49998 11.6832 1.57768 12.2612C1.65836 12.8612 1.83096 13.3665 2.23223 13.7678C2.63351 14.169 3.13876 14.3416 3.73883 14.4223C4.31681 14.5 5.05169 14.5 5.96342 14.5H10.0366C10.9483 14.5 11.6832 14.5 12.2612 14.4223C12.8612 14.3416 13.3665 14.169 13.7678 13.7678C14.169 13.3665 14.3416 12.8612 14.4223 12.2612C14.5 11.6832 14.5 10.9483 14.5 10.0366V10C14.5 9.72386 14.2761 9.5 14 9.5C13.7239 9.5 13.5 9.72386 13.5 10C13.5 10.9569 13.4989 11.6244 13.4312 12.1279C13.3655 12.6171 13.2452 12.8762 13.0607 13.0607C12.8762 13.2452 12.6171 13.3655 12.1279 13.4312C11.6244 13.4989 10.9569 13.5 10 13.5H6C5.04306 13.5 4.37565 13.4989 3.87208 13.4312C3.3829 13.3655 3.12385 13.2452 2.93934 13.0607C2.75483 12.8762 2.63453 12.6171 2.56877 12.1279C2.50106 11.6244 2.5 10.9569 2.5 10Z" fill="#1C274C" />
                    </svg>
                    <span className="text-[#282D3C] text-[14px] not-italic font-normal leading-[20px]">
                        {t("stats_export_report")}
                    </span>
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px] self-stretch">
                <div className="flex w-full p-[24px] flex-col items-start gap-[32px] rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex flex-col justify-center items-start gap-[4px] self-stretch">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M22.0346 2.66699H22.1256C23.3039 2.66698 24.2542 2.66697 25.0193 2.73971C25.8082 2.81472 26.4956 2.97361 27.1137 3.35239C27.7395 3.7359 28.2657 4.26209 28.6492 4.88793C29.028 5.50604 29.1869 6.19342 29.2619 6.98237C29.3347 7.74739 29.3346 8.69771 29.3346 9.87609V9.96721C29.3347 10.7415 29.3347 11.3876 29.2848 11.9125C29.2326 12.4611 29.1194 12.9724 28.832 13.4414C28.5508 13.9004 28.1649 14.2862 27.7059 14.5675C27.237 14.8549 26.7257 14.9681 26.177 15.0202C25.6522 15.0701 25.006 15.0701 24.2317 15.0701L22.7585 15.0701C21.6441 15.0701 20.7148 15.0702 19.9771 14.971C19.1985 14.8663 18.4955 14.636 17.9306 14.0711C17.3656 13.5062 17.1353 12.8031 17.0306 12.0245C16.9315 11.2868 16.9315 10.3575 16.9315 9.24312L16.9315 7.76999C16.9315 6.99572 16.9315 6.34946 16.9814 5.82464C17.0336 5.27597 17.1468 4.76466 17.4342 4.29568C17.7154 3.83673 18.1013 3.45086 18.5602 3.16962C19.0292 2.88222 19.5405 2.76903 20.0892 2.71686C20.614 2.66696 21.2603 2.66698 22.0346 2.66699ZM23.1331 10.4189C22.4938 10.4189 22.1742 10.4189 21.9485 10.2588C21.8689 10.2023 21.7993 10.1328 21.7428 10.0531C21.5827 9.82744 21.5827 9.50781 21.5827 8.86856C21.5827 8.2293 21.5827 7.90964 21.7428 7.68396C21.7993 7.60432 21.8689 7.53479 21.9485 7.47829C22.1742 7.31816 22.4938 7.31816 23.1331 7.31816C23.7723 7.31816 24.092 7.31816 24.3177 7.47829C24.3973 7.53479 24.4668 7.60432 24.5233 7.68396C24.6835 7.90965 24.6835 8.22928 24.6835 8.86854C24.6835 9.50781 24.6835 9.82744 24.5233 10.0531C24.4668 10.1328 24.3973 10.2023 24.3177 10.2588C24.092 10.4189 23.7723 10.4189 23.1331 10.4189Z" fill="#7A5AF9" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M13.4424 3.16962C12.9734 2.88222 12.4621 2.76903 11.9134 2.71686C11.3886 2.66696 10.7424 2.66698 9.9681 2.66699H9.87709C8.69873 2.66698 7.74835 2.66697 6.98334 2.73971C6.19439 2.81472 5.50702 2.97361 4.88891 3.35239C4.26307 3.7359 3.73688 4.26209 3.35337 4.88793C2.97459 5.50604 2.8157 6.19342 2.74069 6.98237C2.66795 7.74738 2.66796 8.69769 2.66797 9.87605V9.96707C2.66795 10.7414 2.66794 11.3876 2.71784 11.9125C2.77001 12.4611 2.8832 12.9724 3.17059 13.4414C3.45184 13.9004 3.83771 14.2862 4.29666 14.5675C4.76564 14.8549 5.27695 14.9681 5.82561 15.0202C6.35041 15.0701 6.99655 15.0701 7.77078 15.0701L9.24409 15.0701C10.3585 15.0701 11.2878 15.0702 12.0255 14.971C12.8041 14.8663 13.5071 14.636 14.0721 14.0711C14.637 13.5062 14.8673 12.8031 14.972 12.0245C15.0711 11.2868 15.0711 10.3575 15.0711 9.24315L15.0711 7.77C15.0711 6.99577 15.0711 6.34944 15.0212 5.82464C14.969 5.27597 14.8558 4.76466 14.5684 4.29568C14.2872 3.83673 13.9013 3.45086 13.4424 3.16962ZM7.68494 10.2588C7.91062 10.4189 8.23025 10.4189 8.86952 10.4189C9.50878 10.4189 9.82842 10.4189 10.0541 10.2588C10.1337 10.2023 10.2033 10.1328 10.2598 10.0531C10.4199 9.82744 10.4199 9.50781 10.4199 8.86854C10.4199 8.22928 10.4199 7.90965 10.2598 7.68396C10.2033 7.60432 10.1337 7.53479 10.0541 7.47829C9.82842 7.31816 9.50878 7.31816 8.86952 7.31816C8.23025 7.31816 7.91062 7.31816 7.68494 7.47829C7.6053 7.53479 7.53577 7.60432 7.47927 7.68396C7.31913 7.90965 7.31913 8.22928 7.31913 8.86854C7.31913 9.50781 7.31913 9.82744 7.47927 10.0531C7.53577 10.1328 7.6053 10.2023 7.68494 10.2588Z" fill="#7A5AF9" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12.0255 17.0297C12.8041 17.1344 13.5071 17.3647 14.0721 17.9296C14.637 18.4945 14.8673 19.1975 14.972 19.9762C15.0711 20.7139 15.0711 21.6432 15.0711 22.7575L15.0711 24.2307C15.0711 25.005 15.0711 25.6512 15.0212 26.176C14.969 26.7247 14.8558 27.236 14.5684 27.705C14.2872 28.1639 13.9013 28.5498 13.4424 28.831C12.9734 29.1184 12.4621 29.2316 11.9134 29.2838C11.3886 29.3337 10.7423 29.3337 9.96806 29.3337H9.87707C8.69869 29.3337 7.74836 29.3337 6.98334 29.2609C6.19439 29.1859 5.50702 29.027 4.88891 28.6483C4.26307 28.2647 3.73688 27.7386 3.35337 27.1127C2.97459 26.4946 2.8157 25.8072 2.74069 25.0183C2.66795 24.2533 2.66796 23.3029 2.66797 22.1246V22.0336C2.66795 21.2592 2.66794 20.613 2.71784 20.0882C2.77001 19.5395 2.8832 19.0282 3.17059 18.5592C3.45184 18.1003 3.83771 17.7144 4.29666 17.4332C4.76564 17.1458 5.27695 17.0326 5.82561 16.9804C6.35043 16.9305 6.9966 16.9305 7.77086 16.9306L9.24409 16.9306C10.3585 16.9305 11.2878 16.9305 12.0255 17.0297ZM8.86952 24.6825C8.23025 24.6825 7.91062 24.6825 7.68494 24.5224C7.6053 24.4659 7.53577 24.3963 7.47927 24.3167C7.31913 24.091 7.31913 23.7714 7.31913 23.1321C7.31913 22.4928 7.31913 22.1732 7.47927 21.9475C7.53577 21.8679 7.6053 21.7984 7.68494 21.7418C7.91062 21.5817 8.23025 21.5817 8.8695 21.5817C9.50876 21.5817 9.82842 21.5817 10.0541 21.7418C10.1337 21.7984 10.2033 21.8679 10.2598 21.9475C10.4199 22.1732 10.4199 22.4928 10.4199 23.1321C10.4199 23.7714 10.4199 24.091 10.2598 24.3167C10.2033 24.3963 10.1337 24.4659 10.0541 24.5224C9.82842 24.6825 9.50878 24.6825 8.86952 24.6825Z" fill="#7A5AF9" />
                            <path d="M16.9315 22.1543V22.2019H18.792C18.792 21.3115 18.7931 20.7138 18.8395 20.2581C18.8843 19.8179 18.9634 19.6146 19.0533 19.4801C19.1664 19.3108 19.3117 19.1654 19.481 19.0523C19.6155 18.9624 19.8189 18.8833 20.2591 18.8385C20.7148 18.7921 21.3125 18.791 22.2029 18.791H24.6835V16.9306H22.1553C21.3248 16.9305 20.6318 16.9305 20.0708 16.9876C19.4835 17.0473 18.9386 17.1772 18.4474 17.5054C18.075 17.7542 17.7552 18.074 17.5064 18.4464C17.1782 18.9376 17.0483 19.4826 16.9886 20.0698C16.9315 20.6308 16.9315 21.3238 16.9315 22.1543Z" fill="#7A5AF9" />
                            <path d="M29.3346 24.7138V24.6825H27.4742C27.4742 25.2731 27.4737 25.6695 27.4527 25.9765C27.4324 26.275 27.3958 26.4204 27.3562 26.5161C27.1988 26.896 26.897 27.1978 26.5171 27.3552C26.4214 27.3948 26.276 27.4314 25.9774 27.4517C25.6705 27.4727 25.2741 27.4732 24.6835 27.4732H22.2028V29.3337H24.7148C25.2661 29.3337 25.7263 29.3337 26.1041 29.3079C26.4974 29.2811 26.8689 29.2232 27.2291 29.074C28.0648 28.7278 28.7288 28.0638 29.075 27.2281C29.2242 26.8679 29.282 26.4964 29.3089 26.1031C29.3347 25.7253 29.3346 25.2651 29.3346 24.7138Z" fill="#7A5AF9" />
                            <path d="M18.792 28.4034C18.792 28.9172 18.3755 29.3337 17.8618 29.3337C17.348 29.3337 16.9315 28.9172 16.9315 28.4034V24.6825H18.792V28.4034Z" fill="#7A5AF9" />
                            <path d="M28.4044 16.9306C27.8906 16.9306 27.4742 17.347 27.4742 17.8608V22.2019H29.3346V17.8608C29.3346 17.347 28.9182 16.9306 28.4044 16.9306Z" fill="#7A5AF9" />
                            <path d="M21.4361 22.1567C21.3346 22.4018 21.3346 22.7124 21.3346 23.3337C21.3346 23.9549 21.3346 24.2655 21.4361 24.5106C21.5715 24.8373 21.831 25.0968 22.1577 25.2322C22.4028 25.3337 22.7134 25.3337 23.3346 25.3337C23.9559 25.3337 24.2665 25.3337 24.5115 25.2322C24.8383 25.0968 25.0978 24.8373 25.2331 24.5106C25.3346 24.2655 25.3346 23.9549 25.3346 23.3337C25.3346 22.7124 25.3346 22.4018 25.2331 22.1567C25.0978 21.83 24.8383 21.5705 24.5115 21.4352C24.2665 21.3337 23.9559 21.3337 23.3346 21.3337C22.7134 21.3337 22.4028 21.3337 22.1577 21.4352C21.831 21.5705 21.5715 21.83 21.4361 22.1567Z" fill="#7A5AF9" />
                        </svg>
                        <span className="text-[#282D3C] font-[Gotham] text-[16px] not-italic font-normal leading-[normal]">
                            {t("stats_tickets_qr")}
                        </span>
                    </div>
                    <span className="text-[#282D3C] text-[32px] not-italic font-bold leading-[normal]">
                        {stats?.ticketsByQr ?? 0}
                    </span>
                </div>
                <div className="flex w-full p-[24px] flex-col items-start gap-[32px] rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex flex-col justify-center items-start gap-[4px] self-stretch">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9.66002 2.66797H22.34C23.8851 2.66797 24.6577 2.66797 25.2808 2.88478C26.4624 3.29591 27.39 4.25089 27.7894 5.46725C28 6.1087 28 6.90404 28 8.49472V27.1669C28 28.3112 26.6867 28.9184 25.8559 28.1581C25.3678 27.7115 24.6322 27.7115 24.1441 28.1581L23.5 28.7475C22.6446 29.5303 21.3554 29.5303 20.5 28.7475C19.6446 27.9647 18.3554 27.9647 17.5 28.7475C16.6446 29.5303 15.3554 29.5303 14.5 28.7475C13.6446 27.9647 12.3554 27.9647 11.5 28.7475C10.6446 29.5303 9.35545 29.5303 8.5 28.7475L7.85587 28.1581C7.36777 27.7115 6.63223 27.7115 6.14413 28.1581C5.31333 28.9184 4 28.3112 4 27.1669V8.49472C4 6.90404 4 6.1087 4.21061 5.46725C4.60997 4.25089 5.53763 3.29591 6.71918 2.88478C7.34228 2.66797 8.11486 2.66797 9.66002 2.66797ZM20.0793 11.334C20.4471 10.922 20.4113 10.2899 19.9993 9.92204C19.5874 9.55421 18.9552 9.58999 18.5874 10.002L14.5714 14.4998L13.4126 13.202C13.0448 12.79 12.4126 12.7542 12.0007 13.122C11.5887 13.4899 11.5529 14.122 11.9207 14.534L13.8255 16.6673C14.0152 16.8798 14.2866 17.0013 14.5714 17.0013C14.8563 17.0013 15.1276 16.8798 15.3174 16.6673L20.0793 11.334ZM10 19.668C9.44772 19.668 9 20.1157 9 20.668C9 21.2203 9.44772 21.668 10 21.668H22C22.5523 21.668 23 21.2203 23 20.668C23 20.1157 22.5523 19.668 22 19.668H10Z" fill="#0E9718" />
                        </svg>
                        <span className="text-[#282D3C] font-[Gotham] text-[16px] not-italic font-normal leading-[normal]">
                            {t("stats_tickets_klm")}
                        </span>
                    </div>
                    <span className="text-[#282D3C] text-[32px] not-italic font-bold leading-[normal]">
                        {stats?.ticketsByKlm ?? 0}
                    </span>
                </div>
                <div className="flex w-full p-[24px] flex-col items-start gap-[32px] rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex flex-col justify-center items-start gap-[4px] self-stretch">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M16 29.3346C22.6274 29.3346 28 23.9621 28 17.3346C28 10.7072 22.6274 5.33464 16 5.33464C9.37258 5.33464 4 10.7072 4 17.3346C4 23.9621 9.37258 29.3346 16 29.3346ZM16 11.0013C16.5523 11.0013 17 11.449 17 12.0013V17.3346C17 17.8869 16.5523 18.3346 16 18.3346C15.4477 18.3346 15 17.8869 15 17.3346V12.0013C15 11.449 15.4477 11.0013 16 11.0013Z" fill="#338FFF" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M12.3333 2.66797C12.3333 2.11568 12.781 1.66797 13.3333 1.66797H18.6667C19.219 1.66797 19.6667 2.11568 19.6667 2.66797C19.6667 3.22025 19.219 3.66797 18.6667 3.66797H13.3333C12.781 3.66797 12.3333 3.22025 12.3333 2.66797Z" fill="#338FFF" />
                        </svg>
                        <span className="text-[#282D3C] font-[Gotham] text-[16px] not-italic font-normal leading-[normal]">
                            {t("stats_avg_wait_queue")}
                        </span>
                    </div>
                    <span className="text-[#282D3C] text-[32px] not-italic font-bold leading-[normal]">
                        {stats?.avgWaitInQueue ?? "—"}
                    </span>
                </div>
                <div className="flex w-full p-[24px] flex-col items-start gap-[32px] rounded-[32px] bg-[#F4F6FB]">
                    <div className="flex flex-col justify-center items-start gap-[4px] self-stretch">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M16 29.3346C22.4482 29.3346 27.6756 24.1563 27.6756 17.7684C27.6756 11.3806 22.4482 6.20222 16 6.20222C9.55177 6.20222 4.32445 11.3806 4.32445 17.7684C4.32445 24.1563 9.55177 29.3346 16 29.3346ZM16 11.664C16.5374 11.664 16.973 12.0956 16.973 12.6279V17.3692L19.9312 20.2997C20.3112 20.6761 20.3112 21.2864 19.9312 21.6628C19.5512 22.0392 18.9352 22.0392 18.5552 21.6628L15.312 18.45C15.1295 18.2692 15.027 18.0241 15.027 17.7684V12.6279C15.027 12.0956 15.4626 11.664 16 11.664Z" fill="#F045BF" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M10.9873 3.12111C11.2721 3.57252 11.1336 4.16717 10.6779 4.44929L5.48876 7.66213C5.03308 7.94426 4.43282 7.80703 4.14802 7.35562C3.86323 6.90421 4.00175 6.30957 4.45743 6.02744L9.64659 2.8146C10.1023 2.53248 10.7025 2.6697 10.9873 3.12111Z" fill="#F045BF" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M21.0127 3.12111C21.2975 2.6697 21.8978 2.53248 22.3534 2.8146L27.5426 6.02744C27.9983 6.30957 28.1368 6.90422 27.852 7.35562C27.5672 7.80703 26.9669 7.94426 26.5112 7.66213L21.3221 4.44929C20.8664 4.16716 20.7279 3.57252 21.0127 3.12111Z" fill="#F045BF" />
                        </svg>
                        <span className="text-[#282D3C] font-[Gotham] text-[16px] not-italic font-normal leading-[normal]">
                            {t("stats_avg_service_time")}
                        </span>
                    </div>
                    <span className="text-[#282D3C] text-[32px] not-italic font-bold leading-[normal]">
                        {stats?.avgServiceTime ?? "—"}
                    </span>
                </div>
            </div>
            <div className="flex p-[24px] flex-col items-start gap-[24px] self-stretch rounded-[32px] bg-[#F3F5F8]">
                <span className="text-[#000] text-[24px] not-italic font-medium leading-[32px]">
                    {t("stats_client_statuses")}
                </span>
                <div className="flex flex-wrap items-stretch gap-[12px] self-stretch">
                    {/* Карточка "Вызваны" */}
                    <div className="flex p-[16px] flex-col items-start gap-[24px] flex-[1_0_0] rounded-[16px] bg-[#FFF]">
                        <div className="flex flex-col justify-center items-start gap-[8px] self-stretch">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle opacity="0.3" cx="16.0013" cy="8.0013" r="5.33333" fill="#1C274C" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M21.9987 29.3333C19.7988 29.3333 18.6989 29.3333 18.0154 28.6499C17.332 27.9665 17.332 26.8666 17.332 24.6667C17.332 22.4668 17.332 21.3668 18.0154 20.6834C18.6989 20 19.7988 20 21.9987 20C24.1986 20 25.2985 20 25.9819 20.6834C26.6654 21.3668 26.6654 22.4668 26.6654 24.6667C26.6654 26.8666 26.6654 27.9665 25.9819 28.6499C25.2985 29.3333 24.1986 29.3333 21.9987 29.3333ZM22.7765 22.5926C22.7765 22.163 22.4283 21.8148 21.9987 21.8148C21.5691 21.8148 21.2209 22.163 21.2209 22.5926V23.8889H19.9246C19.4951 23.8889 19.1468 24.2371 19.1468 24.6667C19.1468 25.0962 19.4951 25.4444 19.9246 25.4444H21.2209V26.7407C21.2209 27.1703 21.5691 27.5185 21.9987 27.5185C22.4283 27.5185 22.7765 27.1703 22.7765 26.7407V25.4444H24.0728C24.5023 25.4444 24.8505 25.0962 24.8505 24.6667C24.8505 24.2371 24.5023 23.8889 24.0728 23.8889H22.7765V22.5926Z" fill="#2990F7" />
                                <path opacity="0.3" d="M20.903 18.0024C20.2722 18.0101 19.6843 18.0331 19.1719 18.1019C18.3147 18.2172 17.3765 18.4926 16.6013 19.2679C15.826 20.0431 15.5506 20.9814 15.4353 21.8386C15.3318 22.6088 15.3319 23.55 15.332 24.5507V24.78C15.3319 25.7807 15.3318 26.7218 15.4353 27.4921C15.5162 28.0936 15.6759 28.735 16.0319 29.332C16.0209 29.332 16.0098 29.332 15.9987 29.332C5.33203 29.332 5.33203 26.6457 5.33203 23.332C5.33203 20.0183 10.1077 17.332 15.9987 17.332C17.7669 17.332 19.4347 17.5741 20.903 18.0024Z" fill="#1C274C" />
                            </svg>
                            <span className="text-[#000] text-[24px] not-italic font-normal leading-[32px]">
                                {t("stats_called")}
                            </span>
                        </div>
                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                            <span className="text-[#000] text-[32px] not-italic font-bold leading-[normal]">
                                {statusMap.get("called")?.count ?? 0}
                            </span>
                            <p className="text-[24px] not-italic font-bold leading-[normal] text-[#2990F7]">
                                {statusMap.get("called")?.percent ?? "0%"}
                            </p>
                        </div>
                    </div>
                    {/* Карточка "Завершены" */}
                    <div className="flex p-[16px] flex-col items-start gap-[24px] flex-[1_0_0] rounded-[16px] bg-[#FFF]">
                        <div className="flex flex-col justify-center items-start gap-[8px] self-stretch">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path opacity="0.3" d="M21.3346 8.0013C21.3346 10.9468 18.9468 13.3346 16.0013 13.3346C13.0558 13.3346 10.668 10.9468 10.668 8.0013C10.668 5.05578 13.0558 2.66797 16.0013 2.66797C18.9468 2.66797 21.3346 5.05578 21.3346 8.0013Z" fill="#1C274C" />
                                <path opacity="0.3" d="M20.903 18.0024C20.2722 18.0101 19.6843 18.0331 19.1719 18.1019C18.3147 18.2172 17.3765 18.4926 16.6013 19.2679C15.826 20.0431 15.5506 20.9814 15.4353 21.8386C15.3318 22.6088 15.3319 23.55 15.332 24.5507V24.78C15.3319 25.7807 15.3318 26.7218 15.4353 27.4921C15.5162 28.0936 15.6759 28.735 16.0319 29.332C16.0209 29.332 16.0098 29.332 15.9987 29.332C5.33203 29.332 5.33203 26.6457 5.33203 23.332C5.33203 20.0183 10.1077 17.332 15.9987 17.332C17.7669 17.332 19.4347 17.5741 20.903 18.0024Z" fill="#1C274C" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M21.9987 29.3333C19.7988 29.3333 18.6989 29.3333 18.0154 28.6499C17.332 27.9665 17.332 26.8666 17.332 24.6667C17.332 22.4668 17.332 21.3668 18.0154 20.6834C18.6989 20 19.7988 20 21.9987 20C24.1986 20 25.2985 20 25.9819 20.6834C26.6654 21.3668 26.6654 22.4668 26.6654 24.6667C26.6654 26.8666 26.6654 27.9665 25.9819 28.6499C25.2985 29.3333 24.1986 29.3333 21.9987 29.3333ZM24.6227 23.6611C24.9265 23.3573 24.9265 22.8649 24.6227 22.5611C24.319 22.2574 23.8265 22.2574 23.5228 22.5611L20.9617 25.1223L20.4746 24.6352C20.1709 24.3315 19.6784 24.3315 19.3747 24.6352C19.0709 24.939 19.0709 25.4314 19.3747 25.7352L20.4117 26.7722C20.7154 27.0759 21.2079 27.0759 21.5116 26.7722L24.6227 23.6611Z" fill="#009C0B" />
                            </svg>
                            <span className="text-[#000] text-[24px] not-italic font-normal leading-[32px]">
                                {t("stats_completed")}
                            </span>
                        </div>
                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                            <span className="text-[#000] text-[32px] not-italic font-bold leading-[normal]">
                                {statusMap.get("completed")?.count ?? 0}
                            </span>
                            <p className="text-[24px] not-italic font-bold leading-[normal] text-[#009C0B]">
                                {statusMap.get("completed")?.percent ?? "0%"}
                            </p>
                        </div>
                    </div>
                    {/* Карточка "Не вызваны" */}
                    <div className="flex p-[16px] flex-col items-start gap-[24px] flex-[1_0_0] rounded-[16px] bg-[#FFF]">
                        <div className="flex flex-col justify-center items-start gap-[8px] self-stretch">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M18.0154 28.6499C18.6989 29.3333 19.7988 29.3333 21.9987 29.3333C24.1986 29.3333 25.2985 29.3333 25.9819 28.6499C26.6654 27.9665 26.6654 26.8666 26.6654 24.6667C26.6654 22.4668 26.6654 21.3668 25.9819 20.6834C25.2985 20 24.1986 20 21.9987 20C19.7988 20 18.6989 20 18.0154 20.6834C17.332 21.3668 17.332 22.4668 17.332 24.6667C17.332 26.8666 17.332 27.9665 18.0154 28.6499ZM21.2209 23.8889H19.9246C19.4951 23.8889 19.1468 24.2371 19.1468 24.6667C19.1468 25.0962 19.4951 25.4444 19.9246 25.4444H21.2209H22.7765H24.0728C24.5023 25.4444 24.8505 25.0962 24.8505 24.6667C24.8505 24.2371 24.5023 23.8889 24.0728 23.8889H22.7765H21.2209Z" fill="#F5A012" />
                                <path opacity="0.3" d="M20.903 18.0024C20.2722 18.0101 19.6843 18.0331 19.1719 18.1019C18.3147 18.2172 17.3765 18.4926 16.6013 19.2679C15.826 20.0431 15.5506 20.9814 15.4353 21.8386C15.3318 22.6088 15.3319 23.55 15.332 24.5507V24.78C15.3319 25.7807 15.3318 26.7218 15.4353 27.4921C15.5162 28.0936 15.6759 28.735 16.0319 29.332C16.0209 29.332 16.0098 29.332 15.9987 29.332C5.33203 29.332 5.33203 26.6457 5.33203 23.332C5.33203 20.0183 10.1077 17.332 15.9987 17.332C17.7669 17.332 19.4347 17.5741 20.903 18.0024Z" fill="#1C274C" />
                                <circle opacity="0.3" cx="16.0013" cy="8.0013" r="5.33333" fill="#1C274C" />
                            </svg>
                            <span className="text-[#000] text-[24px] not-italic font-normal leading-[32px]">
                                {t("stats_not_called")}
                            </span>
                        </div>
                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                            <span className="text-[#000] text-[32px] not-italic font-bold leading-[normal]">
                                {statusMap.get("notCalled")?.count ?? 0}
                            </span>
                            <p className="text-[24px] not-italic font-bold leading-[normal] text-[#F5A012]">
                                {statusMap.get("notCalled")?.percent ?? "0%"}
                            </p>
                        </div>
                    </div>
                    {/* Карточка "Отказались" */}
                    <div className="flex p-[16px] flex-col items-start gap-[24px] flex-[1_0_0] rounded-[16px] bg-[#FFF]">
                        <div className="flex flex-col justify-center items-start gap-[8px] self-stretch">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <path fillRule="evenodd" clipRule="evenodd" d="M21.9987 21C19.9737 21 18.332 22.6416 18.332 24.6667C18.332 25.3338 18.5097 25.9588 18.8209 26.4976L23.8296 21.4889C23.2908 21.1776 22.6659 21 21.9987 21ZM25.2248 22.9221L20.2541 27.8928C20.7729 28.174 21.3668 28.3333 21.9987 28.3333C24.0237 28.3333 25.6654 26.6917 25.6654 24.6667C25.6654 24.0348 25.506 23.4409 25.2248 22.9221ZM16.332 24.6667C16.332 21.5371 18.8691 19 21.9987 19C23.5841 19 25.0189 19.6524 26.0463 20.7008C27.0468 21.7218 27.6654 23.123 27.6654 24.6667C27.6654 27.7963 25.1283 30.3333 21.9987 30.3333C20.455 30.3333 19.0538 29.7148 18.0328 28.7142C16.9844 27.6869 16.332 26.2521 16.332 24.6667Z" fill="#F90F0F" />
                                <g opacity="0.3">
                                    <path d="M21.332 8.0013C21.332 10.9468 18.9442 13.3346 15.9987 13.3346C13.0532 13.3346 10.6654 10.9468 10.6654 8.0013C10.6654 5.05578 13.0532 2.66797 15.9987 2.66797C18.9442 2.66797 21.332 5.05578 21.332 8.0013Z" fill="#1C274C" />
                                    <path d="M19.0588 17.5852C16.2836 18.7384 14.332 21.4753 14.332 24.668C14.332 26.4231 14.9244 28.0433 15.9157 29.3346C5.33203 29.3207 5.33203 26.6397 5.33203 23.3346C5.33203 20.0209 10.1077 17.3346 15.9987 17.3346C17.0623 17.3346 18.0895 17.4222 19.0588 17.5852Z" fill="#1C274C" />
                                </g>
                            </svg>
                            <span className="text-[#000] text-[24px] not-italic font-normal leading-[32px]">
                                {t("stats_refused")}
                            </span>
                        </div>
                        <div className="flex flex-col items-start gap-[4px] self-stretch">
                            <span className="text-[#000] text-[32px] not-italic font-bold leading-[normal]">
                                {statusMap.get("refused")?.count ?? 0}
                            </span>
                            <p className="text-[24px] not-italic font-bold leading-[normal] text-[#DB1D31]">
                                {statusMap.get("refused")?.percent ?? "0%"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-start gap-[20px] self-stretch">
                <span className="text-[#000] text-[24px] not-italic font-medium leading-[32px]">
                    {t("stats_managers_and_ratings")}
                </span>
                <div className="flex flex-col items-start gap-[20px] self-stretch">
                    {/* ── Responsive SVG chart – all labels live inside the viewBox ── */}
                    <div className="flex px-[24px] py-[30px] flex-col items-start self-stretch rounded-[24px] bg-[#F4F6FB] min-w-0">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox={`0 0 ${RATING_CHART.width} ${RATING_CHART.height}`}
                            fill="none"
                            className="w-full h-auto"
                            aria-label={t("stats_rating_chart_aria")}
                        >
                            {/* Horizontal grid lines + Y-axis labels */}
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => {
                                const { padding, width, height } = RATING_CHART;
                                const plotH = height - padding.top - padding.bottom;
                                const y = padding.top + ((10 - n) / 9) * plotH;
                                return (
                                    <g key={n}>
                                        <line
                                            x1={padding.left}
                                            y1={y}
                                            x2={width - padding.right}
                                            y2={y}
                                            stroke="#DDE4F0"
                                            strokeWidth="1"
                                            strokeDasharray="4 4"
                                        />
                                        <text
                                            x={padding.left - 6}
                                            y={y + 5}
                                            textAnchor="end"
                                            fontSize="16"
                                            fill="#718EBF"
                                            fontFamily="sans-serif"
                                        >
                                            {n}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Labels along X axis */}
                            {ratingChartLabels.map((month, i) => {
                                const { padding, width, height } = RATING_CHART;
                                const plotW = width - padding.left - padding.right;
                                const x = padding.left + (i / Math.max(1, ratingChartLabels.length - 1)) * plotW;
                                return (
                                    <text
                                        key={month}
                                        x={x}
                                        y={height - 6}
                                        textAnchor="middle"
                                        fontSize="14"
                                        fill="#718EBF"
                                        fontFamily="sans-serif"
                                    >
                                        {month}
                                    </text>
                                );
                            })}

                            {/* Chart line */}
                            {ratingChartValues.length > 0 && (
                                <path
                                    d={buildRatingLinePath(ratingChartValues)}
                                    stroke="#16DBCC"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {/* Data point dots */}
                            {ratingChartValues.map((v, i) => {
                                const { x, y } = getRatingPoint(v, i, ratingChartValues.length);
                                return (
                                    <circle key={i} cx={x} cy={y} r="5" fill="#FFF" stroke="#16DBCC" strokeWidth="2.5" />
                                );
                            })}
                        </svg>
                    </div>

                    {/* ── Stats cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[24px] self-stretch">
                        {(() => {
                            const topDistributionEntry = ratingSummary
                                ? Object.entries(ratingSummary.distribution).sort((a, b) => b[1] - a[1])[0]
                                : null;

                            const cards = ratingSummary
                                ? [
                                    {
                                        label: t("stats_rating_avg"),
                                        value: roundRating(ratingSummary.avgScore).toFixed(2),
                                        month: t("stats_rating_period"),
                                    },
                                    {
                                        label: t("stats_avg_wait_queue"),
                                        value: stats?.avgWaitInQueue ?? "—",
                                        month: t("stats_rating_period"),
                                    },
                                    {
                                        label: t("stats_avg_service_time"),
                                        value: stats?.avgServiceTime ?? "—",
                                        month: t("stats_rating_period"),
                                    },
                                ]
                                : [
                                    { label: t("stats_rating_avg"), value: "—", month: "" },
                                    { label: t("stats_avg_wait_queue"), value: "—", month: "" },
                                    { label: t("stats_avg_service_time"), value: "—", month: "" },
                                ];

                            return cards.map(({ label, value, month }) => (
                                <div key={label} className="flex h-[222px] p-[16px] flex-col justify-between items-start rounded-[16px] bg-[#F4F6FB]">
                                    <div className="flex flex-col justify-center items-start gap-[8px] self-stretch">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="6" r="4" fill="#1C274C" />
                                            <path d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z" fill="#1C274C" />
                                        </svg>
                                        <p className="text-[#000] text-[20px] not-italic font-normal leading-[normal]">{label}</p>
                                    </div>
                                    <div className="flex flex-col items-start gap-[4px]">
                                        <span className="text-[#000] text-[32px] not-italic font-bold leading-[normal]">{value}</span>
                                        {month && <span className="text-[#1A3C7E] text-[16px] not-italic font-bold leading-[normal]">{month}</span>}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>

                    {/* ── Ratings table ── */}
                    <div className="flex flex-col items-start self-stretch rounded-[16px] !border border-solid !border-[#EBEBEE] bg-[#F4F6FB] overflow-hidden">
                        <div className="flex px-[12px] py-[4px] items-center gap-[24px] self-stretch border-b border-solid border-[#EBEBEE]">
                            <div className="flex p-[4px] items-center gap-[10px] flex-[1_0_0] min-w-0">
                                <span className="text-[#626379] text-[14px] not-italic font-medium leading-[normal]">
                                    {t("stats_table_name")}
                                </span>
                            </div>
                            <div className="flex p-[4px] items-center gap-[10px] flex-[1_0_0] shrink-0">
                                <span className="text-[#626379] text-[14px] not-italic font-medium leading-[normal]">
                                    {t("stats_table_served")}
                                </span>
                            </div>
                            <div className="flex p-[4px] items-center gap-[10px] flex-[1_0_0] shrink-0">
                                <span className="text-[#626379] text-[14px] not-italic font-medium leading-[normal]">
                                    {t("stats_table_no_show")}
                                </span>
                            </div>
                            <div className="flex p-[4px] items-center gap-[10px] flex-[1_0_0] shrink-0">
                                <span className="text-[#626379] text-[14px] not-italic font-medium leading-[normal]">
                                    {t("stats_rating")}
                                </span>
                            </div>
                        </div>
                        {ratingRows.map((row, idx) => {
                            const badge = getRatingBadgeClass(row.rating);
                            const isLast = idx === ratingRows.length - 1;
                            return (
                                <div
                                    key={idx}
                                    className={`flex px-[12px] py-[8px] items-center gap-[24px] self-stretch bg-[#FFF] ${!isLast ? "border-b border-solid border-[#EBEBEE]" : ""}`}
                                >
                                    <div className="flex p-[4px] items-center gap-[8px] flex-[1_0_0] min-w-0">
                                        <p className="flex-[1_0_0] text-[#262842] text-[14px] not-italic font-medium leading-[normal] truncate">{row.shortName || row.name}</p>
                                    </div>
                                    <div className="flex p-[4px] items-center gap-[8px] flex-[1_0_0] shrink-0">
                                        <span className="text-[#262842] text-[14px] not-italic font-medium leading-[normal]">{row.ticketsServed ?? 0}</span>
                                    </div>
                                    <div className="flex p-[4px] items-center gap-[8px] flex-[1_0_0] shrink-0">
                                        <span className="text-[#262842] text-[14px] not-italic font-medium leading-[normal]">{row.ticketsNoShow ?? 0}</span>
                                    </div>
                                    <div className="flex p-[4px] items-center gap-[8px] flex-[1_0_0] shrink-0">
                                        <div className={`flex px-[12px] py-[4px] justify-center items-center gap-[4px] rounded-[24px] ${badge.bg}`}>
                                            <span className={`${badge.text} text-[12px] not-italic font-semibold leading-[normal]`}>{roundRating(row.rating)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="flex p-[24px] flex-col items-start gap-[24px] self-stretch rounded-[32px] bg-[#F3F5F8]">
                <span className="text-[#000] text-[24px] not-italic font-medium leading-[32px]">
                    {t("stats_clients_count")}
                </span>
                <div className="flex w-full px-[25px] py-[22px] flex-col items-start gap-[10px] rounded-[24px] bg-[#FFF] overflow-x-auto">
                    <div className="flex min-w-[520px] lg:min-w-0 items-end gap-[24px] self-stretch">
                        {managerClientsBarsTop.length > 0 ? (
                            managerClientsBarsTop.map((item) => {
                                const isMax = item.value === maxManagerClientsValue && maxManagerClientsValue > 0;
                                const minHeight = 48;
                                const maxHeight = 144;
                                const barHeight = maxManagerClientsValue > 0
                                    ? minHeight + (item.value / maxManagerClientsValue) * (maxHeight - minHeight)
                                    : minHeight;

                                return (
                                    <div key={item.key} className="flex-1 inline-flex flex-col justify-start items-center gap-2">
                                        <div className="self-stretch text-center justify-start text-slate-700 text-sm font-medium">{item.value}</div>
                                        <div
                                            className={`self-stretch rounded-[10px] ${isMax ? "bg-[#1A3C7E] shadow-[0px_0px_35px_0px_rgba(26,60,126,0.20)]" : "bg-slate-100"}`}
                                            style={{ height: `${barHeight}px` }}
                                        />
                                        <div className="self-stretch text-center justify-start text-[#718EBF] text-xs font-normal">{shortenLabel(item.label, 10)}</div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex w-full items-center justify-center py-10 text-sm text-[#718EBF]">
                                {t("stats_managers_clients_no_data")}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap items-stretch gap-4 self-stretch">
                    {[
                        {
                            label: t("stats_avg_service_time"),
                            value: stats?.avgServiceTime ?? "—",
                            itemLabel: t("stats_rating_period"),
                        },
                        {
                            label: t("stats_top_manager_by_served"),
                            value: stats?.topManagerByServed ? String(stats.topManagerByServed.ticketsServed) : "—",
                            itemLabel: stats?.topManagerByServed?.managerName || stats?.topManagerByServed?.managerId || "",
                        },
                        {
                            label: t("stats_refused"),
                            value: String(stats?.noShowCount ?? 0),
                            itemLabel: t("stats_rating_period"),
                        },
                    ].map((item) => (
                        <div key={item.label} className="self-stretch p-4 bg-white rounded-2xl inline-flex flex-col justify-between flex-[1_0_0] items-start">
                            <div className="self-stretch flex flex-col justify-center items-start gap-2">
                                <div className="w-6 h-6 relative">
                                    <div className="w-2 h-2 left-[8px] top-[2px] absolute bg-blue-950 rounded-full" />
                                    <div className="w-4 h-2 left-[4px] top-[13px] absolute bg-blue-950" />
                                </div>
                                <div className="justify-center text-[#1A3C7E] text-xl font-normal">{item.label}</div>
                            </div>
                            <div className="flex flex-col justify-start items-start gap-1">
                                <div className="justify-center text-black text-3xl font-bold">{item.value}</div>
                                <div className="justify-center text-[#1A3C7E] text-base font-bold">{item.itemLabel}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}