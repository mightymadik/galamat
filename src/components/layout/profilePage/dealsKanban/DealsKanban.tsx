"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import KanbanColumn from "./KanbanColumn";
import DealDrawer from "./DealDrawer";
import type { DealCardItem } from "./types";
import { DEAL_STATUS_COLUMNS } from "./types";

const REFRESH_INTERVAL_MS = 45 * 1000;

const PAYMENT_METHOD_KEYS: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "payment_any" },
  { value: "Полная оплата", labelKey: "payment_full" },
  { value: "Рассрочка", labelKey: "payment_installment" },
  { value: "Отложенный платеж", labelKey: "payment_deferred" },
  { value: "Ипотека", labelKey: "payment_hypothec" },
];

const STATUS_TO_KEY: Record<string, string> = {
  "Бронь": "status_reservation",
  "Ожидания оплаты": "status_awaiting_payment",
  "Оплачено": "status_paid",
  "Ожидания договора": "status_awaiting_contract",
  "Договор подписан": "status_contract_signed",
  "Просрочен": "status_overdue",
  "Отменен": "status_canceled",
};

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DealsKanban() {
  const t = useTranslations();
  const [deals, setDeals] = useState<DealCardItem[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, DealCardItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(getTodayIsoDate());
  const [createdAtTo, setCreatedAtTo] = useState<string>(getTodayIsoDate());
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [excludeCancelled, setExcludeCancelled] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (projectFilter) params.set("project", projectFilter);
    if (paymentMethodFilter) params.set("paymentMethod", paymentMethodFilter.trim());
    if (createdAtFrom) params.set("createdAtFrom", createdAtFrom);
    if (createdAtTo) params.set("createdAtTo", createdAtTo);
    if (overdueOnly) params.set("overdue", "1");
    if (!excludeCancelled) params.set("excludeCancelled", "0");

    try {
      const res = await fetch(`/api/manager/deals?${params}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) setError(t("manager_only_access"));
        else setError(t("load_error"));
        return;
      }
      const json = await res.json();
      const list = json.deals ?? [];
      setDeals(list);
      setByStatus(json.byStatus ?? {});
      setError(null);
      if (!projectFilter && list.length > 0) {
        const names = new Set<string>();
        for (const d of list) {
          const p = (d as DealCardItem)?.property?.projectName?.trim();
          if (p) names.add(p);
        }
        setProjectOptions(Array.from(names).sort());
      }
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  }, [search, projectFilter, paymentMethodFilter, createdAtFrom, createdAtTo, overdueOnly, excludeCancelled, t]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    const t = setInterval(fetchDeals, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchDeals]);

  const columns = DEAL_STATUS_COLUMNS;
  const visibleColumns = statusFilter ? [statusFilter] : columns;
  const statusItems = [{ key: "__all__", label: t("all_columns") }, ...columns.map((s) => ({ key: s, label: t(STATUS_TO_KEY[s] ?? s) }))];
  const paymentItems = PAYMENT_METHOD_KEYS.map(({ value, labelKey }) => ({ key: value || "__any__", label: t(labelKey) }));

  if (loading && deals.length === 0) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("deals")}</h1>
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("deals")}</h1>
        <p className="text-red-600">{error}</p>
        <Button onPress={fetchDeals}>{t("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1095px] flex-col gap-6">
      <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("deals")}</h1>

      <div className="max-w-[1095px] sticky top-0 z-20 flex flex-wrap items-end gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
        <Input
          label={t("search")}
          placeholder={t("search_placeholder_deals")}
          value={search}
          onValueChange={setSearch}
          size="sm"
          isClearable
          onClear={() => setSearch("")}
          classNames={{ base: "max-w-[180px]" }}
        />
        <Select
          label={t("status_label")}
          placeholder={t("all_columns")}
          items={statusItems}
          selectedKeys={statusFilter ? [statusFilter] : ["__all__"]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as string;
            setStatusFilter(k === "__all__" ? "" : k ?? "");
          }}
          size="sm"
          classNames={{ base: "max-w-[180px]" }}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
        <Select
          label={t("project_label")}
          placeholder={t("project_placeholder")}
          selectedKeys={projectFilter ? [projectFilter] : [""]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as string;
            setProjectFilter(k ?? "");
          }}
          size="sm"
          classNames={{ base: "max-w-[180px]" }}
          items={[{ key: "", label: t("project_placeholder") }, ...projectOptions.map((p) => ({ key: p, label: p }))]}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
        <Select
          label={t("payment_type_label")}
          placeholder={t("payment_any")}
          items={paymentItems}
          selectedKeys={paymentMethodFilter ? [paymentMethodFilter] : ["__any__"]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as string;
            setPaymentMethodFilter(k === "__any__" ? "" : k ?? "");
          }}
          size="sm"
          classNames={{ base: "max-w-[180px]" }}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
        <Input
          type="date"
          label="Дата с"
          value={createdAtFrom}
          onValueChange={setCreatedAtFrom}
          size="sm"
          classNames={{ base: "max-w-[180px]" }}
        />
        <Input
          type="date"
          label="Дата по"
          value={createdAtTo}
          onValueChange={setCreatedAtTo}
          size="sm"
          classNames={{ base: "max-w-[180px]" }}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-default-500">{t("checkboxes_label")}</span>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
              />
              {t("overdue_only")}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={excludeCancelled}
                onChange={(e) => setExcludeCancelled(e.target.checked)}
              />
              {t("exclude_cancelled")}
            </label>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="flat" color="default" onPress={() => {
            setSearch("");
            setStatusFilter("");
            setProjectFilter("");
            setPaymentMethodFilter("");
            const today = getTodayIsoDate();
            setCreatedAtFrom(today);
            setCreatedAtTo(today);
            setOverdueOnly(false);
            setExcludeCancelled(true);
          }}>
            {t("reset")}
          </Button>
          <Button size="sm" variant="flat" color="primary" onPress={fetchDeals}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      <div className="max-w-[1095px] flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {visibleColumns.map((status) => {
          const list = byStatus[status] ?? [];
          return (
            <KanbanColumn
              key={status}
              status={status}
              statusLabel={t(STATUS_TO_KEY[status] ?? status)}
              deals={list}
              onCardClick={(deal) => setSelectedDealId(deal.documentId)}
            />
          );
        })}
      </div>

      {selectedDealId && (
        <DealDrawer
          dealDocumentId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
          onUpdated={fetchDeals}
        />
      )}
    </div>
  );
}
