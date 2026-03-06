"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { DealCardItem } from "./types";

const STATUS_TO_KEY: Record<string, string> = {
  "Бронь": "status_reservation",
  "Ожидания оплаты": "status_awaiting_payment",
  "Оплачено": "status_paid",
  "Ожидания договора": "status_awaiting_contract",
  "Договор подписан": "status_contract_signed",
  "Просрочен": "status_overdue",
  "Отменен": "status_canceled",
};

const STATUS_COLORS: Record<string, string> = {
  Бронь: "bg-amber-100 border-amber-300",
  "Ожидания оплаты": "bg-blue-50 border-blue-200",
  Оплачено: "bg-emerald-50 border-emerald-200",
  "Ожидания договора": "bg-violet-50 border-violet-200",
  "Договор подписан": "bg-green-100 border-green-300",
  Просрочен: "bg-red-50 border-red-300",
  Отменен: "bg-slate-100 border-slate-300",
};

function formatPrice(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getExpiresColor(expiresAt: string | null): "" | "text-amber-600" | "text-red-600" {
  if (!expiresAt) return "";
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff < 2 * 60 * 60 * 1000) return "text-red-600";
  if (diff < 24 * 60 * 60 * 1000) return "text-amber-600";
  return "";
}

export default function DealCard({
  deal,
  onClick,
}: {
  deal: DealCardItem;
  onClick: () => void;
}) {
  const t = useTranslations();
  const total = deal.dealPrice ?? 0;
  const paid = deal.downPayment ?? deal.reserveSum ?? 0;
  const remainder = Math.max(0, total - paid);
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const progressColor =
    progress >= 100 ? "bg-green-500" : progress > 0 ? "bg-amber-500" : "bg-red-400";

  const expiresColor = getExpiresColor(deal.expiresAt);
  const expiresLabel = deal.expiresAt ? `${t("until_date")} ${formatDate(deal.expiresAt)}` : null;

  const nextPay = deal.nextPayment;
  const nextPayOverdue =
    nextPay?.dueDate && new Date(nextPay.dueDate) < new Date();

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`
        rounded-xl border p-3 shadow-sm transition hover:shadow-md cursor-pointer
        text-left w-full flex flex-col gap-2
        ${STATUS_COLORS[deal.dealStatus] ?? "bg-white border-gray-200"}
      `}
    >
      <div className="flex flex-col justify-between items-start gap-2">
        <div>
          <span className="text-xs text-gray-500">{t("apartment_short")}</span>
          <p className="font-medium text-gray-900">
            {deal.property?.apartmentNumber ?? "—"} · {deal.property?.projectName || "—"}
          </p>
        </div>
        {expiresLabel && (
          <span className={`text-xs shrink-0 ${expiresColor}`}>{expiresLabel}</span>
        )}
      </div>

      <div className="text-sm text-gray-700">
        <p className="font-medium truncate">{deal.customer?.displayName || "—"}</p>
        <p className="text-xs text-gray-500">{deal.customer?.phone || "—"}</p>
        {deal.manager?.displayName && (
          <p className="text-xs text-gray-500 mt-0.5">{t("manager")}: {deal.manager.displayName}</p>
        )}
      </div>

      <div className="mt-auto space-y-1">
        <div className="flex flex-col justify-between text-xs">
          <span>{t("deal_amount")}: {formatPrice(total)}</span>
          <span>{t("remainder")}: {formatPrice(remainder)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {nextPay && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">{t("next_payment")}</span>
          <span className={nextPayOverdue ? "text-red-600 font-medium" : ""}>
            {formatDate(nextPay.dueDate)} · {formatPrice(nextPay.amount)}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {t(STATUS_TO_KEY[deal.dealStatus] ?? deal.dealStatus)}
        </span>
      </div>
    </article>
  );
}
