"use client";

import React from "react";
import DealCard from "./DealCard";
import type { DealCardItem } from "./types";

const COLUMN_HEAD_COLORS: Record<string, string> = {
  Бронь: "bg-amber-100 text-amber-900",
  "Ожидания оплаты": "bg-blue-100 text-blue-900",
  Оплачено: "bg-emerald-100 text-emerald-900",
  "Ожидания договора": "bg-violet-100 text-violet-900",
  "Договор подписан": "bg-green-100 text-green-900",
  Просрочен: "bg-red-100 text-red-900",
  Отменен: "bg-slate-200 text-slate-700",
};

export default function KanbanColumn({
  status,
  statusLabel,
  deals,
  onCardClick,
}: {
  status: string;
  statusLabel: string;
  deals: DealCardItem[];
  onCardClick: (deal: DealCardItem) => void;
}) {
  const headClass = COLUMN_HEAD_COLORS[status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="flex flex-col w-[280px] shrink-0 rounded-xl bg-gray-50/80 border border-gray-200 overflow-hidden">
      <header
        className={`sticky top-0 z-10 px-3 py-2 ${headClass} border-b border-gray-200`}
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm">{statusLabel}</span>
          <span className="text-xs opacity-80">{deals.length}</span>
        </div>
      </header>
      <div className="flex flex-col gap-2 p-2 overflow-y-auto min-h-[320px] max-h-[calc(100vh-360px)]">
        {deals.map((deal) => (
          <DealCard
            key={deal.documentId}
            deal={deal}
            onClick={() => onCardClick(deal)}
          />
        ))}
      </div>
    </div>
  );
}
