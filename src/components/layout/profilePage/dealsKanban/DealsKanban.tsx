"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

const KAZREESTR_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Все" },
  { value: "Зарегистрировано", label: "Зарегистрировано" },
  { value: "Отказано", label: "Отказано" },
  { value: "Не применимо", label: "Не отправлено" },
];

const STATUS_TO_KEY: Record<string, string> = {
  "Бронь": "status_reservation",
  "Ожидания оплаты": "status_awaiting_payment",
  "Оплачено": "status_paid",
  "Согласование РОП": "status_rop_approval",
  "Ожидания договора": "status_awaiting_contract",
  "Договор подписан": "status_contract_signed",
  "Просрочен": "status_overdue",
  "Отменен": "status_canceled",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  "Бронь": "bg-blue-100 text-blue-700",
  "Ожидания оплаты": "bg-amber-100 text-amber-700",
  "Оплачено": "bg-emerald-100 text-emerald-700",
  "Согласование РОП": "bg-violet-100 text-violet-700",
  "Ожидания договора": "bg-cyan-100 text-cyan-700",
  "Договор подписан": "bg-green-100 text-green-700",
  "Просрочен": "bg-red-100 text-red-700",
  "Отменен": "bg-zinc-200 text-zinc-700",
};

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  const amount = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ");
  return `${amount} ₸`;
}

function formatPropertyType(deal: DealCardItem): string {
  const typeLabel = deal.property?.typeLabel?.trim();
  if (typeLabel) return typeLabel;

  switch (deal.property?.type) {
    case "property":
      return "Квартира";
    case "commerce":
      return "Коммерция";
    case "parking":
      return "Паркинг";
    case "pantry":
      return "Кладовая";
    default:
      return "-";
  }
}

export default function DealsKanban() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [deals, setDeals] = useState<DealCardItem[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, DealCardItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [kazreestrStatusFilter, setKazreestrStatusFilter] = useState<string>("");
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(getTodayIsoDate());
  const [createdAtTo, setCreatedAtTo] = useState<string>(getTodayIsoDate());
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedFromQueryRef = useRef(false);

  const fetchDeals = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (projectFilter) params.set("project", projectFilter);
    if (paymentMethodFilter) params.set("paymentMethod", paymentMethodFilter.trim());
    if (kazreestrStatusFilter) params.set("kazreestrStatus", kazreestrStatusFilter.trim());
    if (createdAtFrom) params.set("createdAtFrom", createdAtFrom);
    if (createdAtTo) params.set("createdAtTo", createdAtTo);

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
  }, [search, projectFilter, paymentMethodFilter, kazreestrStatusFilter, createdAtFrom, createdAtTo, t]);

  useEffect(() => {
    if (selectedFromQueryRef.current) return;
    const dealId = searchParams.get("deal");
    if (!dealId) return;
    selectedFromQueryRef.current = true;
    setSelectedDealId(dealId);
  }, [searchParams]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    const t = setInterval(fetchDeals, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchDeals]);

  const columns = DEAL_STATUS_COLUMNS;
  const visibleColumns = statusFilter ? [statusFilter] : columns;
  const listDeals: Array<DealCardItem & { __status: string }> = visibleColumns.flatMap((status) =>
    (byStatus[status] ?? []).map((deal) => ({ ...deal, __status: status })),
  );
  const totalListPages = Math.max(1, Math.ceil(listDeals.length / listPageSize));
  const safePage = Math.min(listPage, totalListPages);
  const paginatedDeals = listDeals.slice((safePage - 1) * listPageSize, safePage * listPageSize);
  const listStartItem = listDeals.length === 0 ? 0 : (safePage - 1) * listPageSize + 1;
  const listEndItem = Math.min(safePage * listPageSize, listDeals.length);
  const statusItems = [{ key: "__all__", label: t("all_columns") }, ...columns.map((s) => ({ key: s, label: t(STATUS_TO_KEY[s] ?? s) }))];
  const paymentItems = PAYMENT_METHOD_KEYS.map(({ value, labelKey }) => ({ key: value || "__any__", label: t(labelKey) }));
  const kazreestrItems = KAZREESTR_STATUS_OPTIONS.map(({ value, label }) => ({ key: value || "__any__", label }));
  const pageSizeItems = [10, 20, 50].map((size) => ({ key: String(size), label: `${size}` }));

  useEffect(() => {
    setListPage(1);
  }, [search, statusFilter, projectFilter, paymentMethodFilter, kazreestrStatusFilter, createdAtFrom, createdAtTo]);

  useEffect(() => {
    if (viewMode === "list") setListPage(1);
  }, [viewMode]);

  useEffect(() => {
    if (listPage > totalListPages) {
      setListPage(totalListPages);
    }
  }, [listPage, totalListPages]);

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
        <Select
          label="Казреестр"
          placeholder="Все"
          items={kazreestrItems}
          selectedKeys={kazreestrStatusFilter ? [kazreestrStatusFilter] : ["__any__"]}
          onSelectionChange={(keys) => {
            const k = Array.from(keys)[0] as string;
            setKazreestrStatusFilter(k === "__any__" ? "" : k ?? "");
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "solid" : "flat"}
            color={viewMode === "kanban" ? "primary" : "default"}
            onPress={() => setViewMode("kanban")}
          >
            Канбан
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "solid" : "flat"}
            color={viewMode === "list" ? "primary" : "default"}
            onPress={() => setViewMode("list")}
          >
            Список
          </Button>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="flat" color="default" onPress={() => {
            setSearch("");
            setStatusFilter("");
            setProjectFilter("");
            setPaymentMethodFilter("");
            setKazreestrStatusFilter("");
            const today = getTodayIsoDate();
            setCreatedAtFrom(today);
            setCreatedAtTo(today);
          }}>
            {t("reset")}
          </Button>
          <Button size="sm" variant="flat" color="primary" onPress={fetchDeals}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="max-w-[1095px] flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
          {visibleColumns.map((status) => {
            const list = byStatus[status] ?? [];
            return (
              <KanbanColumn
                key={status}
                status={status}
                statusLabel={t(STATUS_TO_KEY[status] ?? status)}
                deals={list}
                onCardClick={(deal) => {
                  setSelectedDealId(deal.documentId);
                  const next = new URLSearchParams(searchParams.toString());
                  next.set("deal", deal.documentId);
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="max-w-[1095px] min-h-[400px] rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Найдено: <span className="font-semibold">{listDeals.length}</span>
              {listDeals.length > 0 && (
                <span className="text-gray-500 ml-2">
                  ({listStartItem}-{listEndItem})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">На странице</span>
              <Select
                items={pageSizeItems}
                selectedKeys={[String(listPageSize)]}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys)[0] as string;
                  const nextSize = Number(k);
                  if (!Number.isNaN(nextSize) && nextSize > 0) {
                    setListPageSize(nextSize);
                    setListPage(1);
                  }
                }}
                size="sm"
                classNames={{ base: "w-[86px]" }}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-[1.2fr_1.2fr_0.9fr_1.1fr_1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 bg-gray-50 text-xs uppercase tracking-wide font-semibold text-gray-500 border-b border-gray-200">
            <span>Клиент / Проект</span>
            <span>Статус</span>
            <span>№</span>
            <span>Тип объекта</span>
            <span>Менеджер</span>
            <span>Стоимость</span>
            <span>Оплата</span>
            <span>Создано</span>
          </div>
          <div className="divide-y divide-gray-100">
            {paginatedDeals.map((deal) => (
              <button
                key={deal.documentId}
                type="button"
                className="w-full grid grid-cols-[1.2fr_1.2fr_0.9fr_1.1fr_1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-left hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 transition"
                onClick={() => {
                  setSelectedDealId(deal.documentId);
                  const next = new URLSearchParams(searchParams.toString());
                  next.set("deal", deal.documentId);
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                }}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800 truncate">{deal.customer?.displayName || "-"}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {deal.property?.projectName || "-"}
                  </span>
                </span>
                <span className="min-w-0">
                  <span
                    className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-xs font-medium truncate ${STATUS_BADGE_STYLES[deal.__status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {t(STATUS_TO_KEY[deal.__status] ?? deal.__status)}
                  </span>
                </span>
                <span className="text-sm text-gray-700 truncate">{deal.property?.apartmentNumber || "-"}</span>
                <span className="text-sm text-gray-700 truncate">{formatPropertyType(deal)}</span>
                <span className="text-sm text-gray-700 truncate">{deal.manager?.displayName || "-"}</span>
                <span className="text-sm text-gray-700 truncate">{formatCurrency(deal.dealPrice)}</span>
                <span className="text-sm text-gray-600 truncate">{deal.paymentMethod || "-"}</span>
                <span className="text-sm text-gray-500 truncate">{formatDate(deal.createdAt)}</span>
              </button>
            ))}
            {listDeals.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-medium text-gray-700">{t("no_data")}</p>
                <p className="text-xs text-gray-500 mt-1">Измените фильтры или обновите список</p>
              </div>
            )}
          </div>
          {listDeals.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-600">
                Страница {safePage} из {totalListPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled={safePage <= 1}
                  onPress={() => setListPage((prev) => Math.max(1, prev - 1))}
                >
                  Назад
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  isDisabled={safePage >= totalListPages}
                  onPress={() => setListPage((prev) => Math.min(totalListPages, prev + 1))}
                >
                  Вперед
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedDealId && (
        <DealDrawer
          dealDocumentId={selectedDealId}
          onClose={() => {
            setSelectedDealId(null);
            const next = new URLSearchParams(searchParams.toString());
            next.delete("deal");
            const qs = next.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          onUpdated={fetchDeals}
        />
      )}
    </div>
  );
}
