"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Select, SelectItem } from "@heroui/react";

export interface CashierScheduleRow {
  documentId: string;
  index: number;
  dueDate: string | null;
  amount: number;
  paymentStatus: string;
}

export interface CashierPaymentRow {
  documentId: string;
  amount: number;
  paymentStatus: string;
  createdAt: string | null;
  confirmedAt: string | null;
  confirmedByDisplayName?: string | null;
  receiptUrl?: string | null;
  receiptName?: string | null;
}

export interface CashierDeal {
  documentId: string;
  dealStatus: string;
  createdAt?: string | null;
  dealPrice: number;
  paidAmount: number;
  paymentMethod: string | null;
  property: {
    projectName: string;
    apartmentNumber?: string | number;
    type?: "property" | "commerce" | "parking" | "pantry";
    typeLabel?: string;
  };
  customer: { displayName: string; phone?: string };
  manager?: { displayName: string } | null;
  paymentSchedules: CashierScheduleRow[];
  payments: CashierPaymentRow[];
}

type DealAgreementItem = {
  url: string;
  name?: string;
  templateType?: string;
  agreementNumber?: string | null;
};

const formatMoney = (n: number) =>
  `${Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadgeClass(status: string): string {
  const s = (status || "").trim();
  if (s === "Оплачено") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "Просрочено") return "bg-red-100 text-red-800 border-red-200";
  if (s === "Не оплачено") return "bg-red-50 text-red-700 border-red-100";
  if (s === "Ожидание") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function StatusBadge({ status }: { status: string }) {
  const label = status || "—";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(label)}`}>
      {label}
    </span>
  );
}

function agreementLabel(a: DealAgreementItem): string {
  const templateType = (a.templateType ?? "").trim();
  const agreementNumber = (a.agreementNumber ?? "").trim();
  const byFields = `${templateType}${agreementNumber ? ` ${agreementNumber}` : ""}`.trim();
  if (byFields) return byFields;
  const name = (a.name ?? "").trim();
  if (name) return name;
  return "Договор";
}

/**
 * Вычисляет остаток по каждой позиции графика на основе кумулятивной суммы оплат.
 * Возвращает массив remainder[] в том же порядке, что и schedules.
 */
function computeScheduleRemainders(
  schedules: CashierScheduleRow[],
  paidAmount: number
): number[] {
  let remaining = paidAmount;
  return schedules.map((s) => {
    const rowAmount = Number(s.amount ?? 0);
    const covered = Math.min(remaining, rowAmount);
    remaining = Math.max(0, remaining - rowAmount);
    return Math.max(0, rowAmount - covered);
  });
}

/**
 * Определяет номер позиции графика для каждого платежа.
 * Платежи сортируются по дате (asc), потом распределяются по позициям кумулятивно.
 */
function computePaymentScheduleIndexes(
  schedules: CashierScheduleRow[],
  payments: CashierPaymentRow[]
): Map<string, number> {
  const result = new Map<string, number>();
  const sorted = [...payments]
    .filter((p) => p.paymentStatus === "Оплачено")
    .sort((a, b) => {
      const da = a.confirmedAt ?? a.createdAt ?? "";
      const db = b.confirmedAt ?? b.createdAt ?? "";
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const capacities = schedules.map((s) => Number(s.amount ?? 0));
  const filled = capacities.map(() => 0);

  for (const p of sorted) {
    let payAmount = Number(p.amount ?? 0);
    for (let i = 0; i < capacities.length && payAmount > 0; i++) {
      const space = capacities[i] - filled[i];
      if (space <= 0) continue;
      const take = Math.min(payAmount, space);
      filled[i] += take;
      payAmount -= take;
      if (!result.has(p.documentId)) {
        result.set(p.documentId, schedules[i].index);
      }
    }
    if (!result.has(p.documentId) && schedules.length > 0) {
      result.set(p.documentId, schedules[schedules.length - 1].index);
    }
  }
  return result;
}

const CASHIER_ONLY_KEY = "cashier_only_access";
const CASHIER_DEAL_STATUSES = ["Ожидания оплаты", "Договор подписан", "Просрочено"] as const;
const SCHEDULE_CONFIRMABLE_STATUSES = ["Ожидание", "Просрочено"];
const PAGE_SIZE = 10;

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CashierPayments() {
  const t = useTranslations();
  const [deals, setDeals] = useState<CashierDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingDealId, setConfirmingDealId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreementLoadingDealId, setAgreementLoadingDealId] = useState<string | null>(null);
  const [agreementsByDeal, setAgreementsByDeal] = useState<Record<string, DealAgreementItem[]>>({});
  const [filterProject, setFilterProject] = useState("");
  const [filterApartment, setFilterApartment] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(getTodayIsoDate());
  const [createdAtTo, setCreatedAtTo] = useState<string>(getTodayIsoDate());
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/cashier/deals", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? CASHIER_ONLY_KEY : "load_error");
        return res.json();
      })
      .then((json) => setDeals(json.deals ?? []))
      .catch((err) => setError(err?.message === CASHIER_ONLY_KEY ? t("cashier_only_access") : err?.message === "load_error" ? t("load_error") : t("network_error")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeDeals = useMemo(
    () => deals.filter((d) => CASHIER_DEAL_STATUSES.includes((d.dealStatus || "").trim() as (typeof CASHIER_DEAL_STATUSES)[number])),
    [deals]
  );

  const filteredDeals = useMemo(() => {
    const proj = filterProject.trim().toLowerCase();
    const apt = filterApartment.trim().toLowerCase();
    const mgr = filterManager.trim().toLowerCase();
    const from = createdAtFrom ? new Date(`${createdAtFrom}T00:00:00`) : null;
    const to = createdAtTo ? new Date(`${createdAtTo}T23:59:59.999`) : null;
    if (!proj && !apt && !mgr && !from && !to) return activeDeals;
    return activeDeals.filter((d) => {
      if (proj && !(d.property?.projectName ?? "").toLowerCase().includes(proj)) return false;
      const aptStr = d.property?.apartmentNumber != null ? String(d.property.apartmentNumber) : "";
      if (apt && !aptStr.toLowerCase().includes(apt)) return false;
      const managerName = (d.manager?.displayName ?? "").toLowerCase();
      if (mgr && !managerName.includes(mgr)) return false;
      if (from || to) {
        const created = d.createdAt ? new Date(d.createdAt) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }
      return true;
    });
  }, [activeDeals, filterProject, filterApartment, filterManager, createdAtFrom, createdAtTo]);

  const projectOptions = useMemo(() => {
    const names = new Set<string>();
    for (const d of activeDeals) {
      const p = (d.property?.projectName ?? "").trim();
      if (p) names.add(p);
    }
    return Array.from(names).sort();
  }, [activeDeals]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedDeals = useMemo(
    () => filteredDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredDeals, safePage]
  );

  useEffect(() => {
    setPage((p) => (p > totalPages ? Math.max(1, totalPages) : p));
  }, [totalPages]);

  const startConfirm = (deal: CashierDeal) => {
    setConfirmingDealId(deal.documentId);
    const firstPending = deal.paymentSchedules.find((s) => SCHEDULE_CONFIRMABLE_STATUSES.includes(s.paymentStatus));
    setScheduleId(firstPending?.documentId ?? null);
    setAmount(firstPending ? String(firstPending.amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "");
    setReceiptFile(null);
    setSubmitError(null);
  };

  const cancelConfirm = () => {
    setConfirmingDealId(null);
    setScheduleId(null);
    setAmount("");
    setReceiptFile(null);
    setSubmitError(null);
  };

  const submitConfirm = async () => {
    if (!confirmingDealId) return;
    if (submittingPayment) return;
    if (!receiptFile || receiptFile.size === 0) {
      setSubmitError(t("attach_receipt_error"));
      return;
    }
    const num = parseInt(String(amount).replace(/\D/g, ""), 10);
    if (!num || num <= 0) {
      setSubmitError(t("enter_amount_error"));
      return;
    }
    const deal = deals.find((d) => d.documentId === confirmingDealId);
    if (deal) {
      const remaining = Number(deal.dealPrice) - Number(deal.paidAmount);
      if (num > remaining) {
        setSubmitError(`Сумма (${formatMoney(num)}) превышает остаток по сделке (${formatMoney(remaining)})`);
        return;
      }
    }
    setSubmitError(null);
    const form = new FormData();
    form.append("dealDocumentId", confirmingDealId);
    form.append("amount", String(num));
    if (scheduleId) form.append("paymentScheduleDocumentId", scheduleId);
    if (receiptFile) form.append("receipt", receiptFile);
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/cashier/confirm-payment", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(json?.error ?? t("confirm_payment_error"));
        return;
      }
      await load();
      cancelConfirm();
    } catch {
      setSubmitError(t("network_error"));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const loadDealAgreements = async (dealDocumentId: string) => {
    if (agreementLoadingDealId) return;
    setAgreementLoadingDealId(dealDocumentId);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/signed-agreement`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const agreements: DealAgreementItem[] = Array.isArray(json?.agreements)
        ? json.agreements.filter((a: unknown): a is DealAgreementItem => !!a && typeof (a as DealAgreementItem).url === "string")
        : [];
      if (agreements.length > 0) {
        setAgreementsByDeal((prev) => ({ ...prev, [dealDocumentId]: agreements }));
      } else if (res.status === 404) {
        alert("Договор не найден");
      } else {
        alert(json?.error ?? "Не удалось получить договор");
      }
    } catch {
      alert(t("load_error"));
    } finally {
      setAgreementLoadingDealId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("cashier")}</h1>
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("cashier")}</h1>
        <p className="text-red-600">{error}</p>
        <Button size="sm" variant="flat" color="primary" onPress={load}>{t("refresh")}</Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6">
      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("cashier")}</h1>
          <p className="text-[#122C5E] text-base opacity-80 mt-1">
            {t("cashier_description")}
          </p>
        </div>
        <Button size="sm" variant="flat" color="primary" onPress={load} isDisabled={loading}>
          {t("refresh")}
        </Button>
      </div>

      {activeDeals.length > 0 && (
        <div className="rounded-[20px] border border-[#122C5E]/10 bg-white/80 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_project")}</label>
              <Select
                size="sm"
                selectedKeys={filterProject ? [filterProject] : [""]}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys)[0] as string;
                  setFilterProject(k ?? "");
                  setPage(1);
                }}
                placeholder={t("filter_project_placeholder")}
                classNames={{ trigger: "min-h-9 rounded-[10px]" }}
                items={[{ key: "", label: t("filter_project_placeholder") }, ...projectOptions.map((p) => ({ key: p, label: p }))]}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_object")}</label>
              <Input
                size="sm"
                value={filterApartment}
                onValueChange={(v) => {
                  setFilterApartment(v);
                  setPage(1);
                }}
                placeholder={t("filter_object_placeholder")}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_manager")}</label>
              <Input
                size="sm"
                value={filterManager}
                onValueChange={(v) => {
                  setFilterManager(v);
                  setPage(1);
                }}
                placeholder={t("filter_manager_placeholder")}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">Дата с</label>
              <Input
                type="date"
                size="sm"
                value={createdAtFrom}
                onValueChange={(v) => {
                  setCreatedAtFrom(v);
                  setPage(1);
                }}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">Дата по</label>
              <Input
                type="date"
                size="sm"
                value={createdAtTo}
                onValueChange={(v) => {
                  setCreatedAtTo(v);
                  setPage(1);
                }}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <Button
              size="sm"
              variant="flat"
              className="shrink-0 rounded-[10px] self-end lg:self-auto"
              onPress={() => {
                setFilterProject("");
                setFilterApartment("");
                setFilterManager("");
                const today = getTodayIsoDate();
                setCreatedAtFrom(today);
                setCreatedAtTo(today);
                setPage(1);
              }}
            >
              {t("reset")}
            </Button>
          </div>
        </div>
      )}

      {activeDeals.length === 0 ? (
        <div className="rounded-[32px] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#122C5E] opacity-70">{t("no_deals")}</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-[32px] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#122C5E] opacity-70">{t("no_deals_match_filters")}</p>
          <Button size="sm" variant="flat" color="primary" className="mt-2" onPress={() => { setFilterProject(""); setFilterApartment(""); setFilterManager(""); setPage(1); }}>
            {t("reset")}
          </Button>
        </div>
      ) : (
        <>
        <div className="flex flex-col gap-4">
          {paginatedDeals.map((deal) => {
            const remainders = computeScheduleRemainders(deal.paymentSchedules, deal.paidAmount);
            const paymentToSchedule = computePaymentScheduleIndexes(deal.paymentSchedules, deal.payments);

            return (
            <div key={deal.documentId} className="overflow-hidden rounded-[24px] border border-[#122C5E]/10 bg-[#F4F6FB]">
              <button
                type="button"
                className="w-full grid grid-cols-1 gap-3 py-4 px-4 text-left transition-colors hover:bg-[#122C5E]/05 sm:grid-cols-2 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(160px,200px)_auto_auto] lg:items-center lg:gap-4 lg:py-5 lg:px-6"
                onClick={() => setExpandedId(expandedId === deal.documentId ? null : deal.documentId)}
              >
                <div className="min-w-0">
                  <span className="truncate text-[#122C5E] font-medium">
                    {(deal.property.typeLabel || (deal.property.type === "property" ? t("apartment_short") : t("object")))}{" "}
                    №{deal.property.apartmentNumber != null && deal.property.apartmentNumber !== "" ? deal.property.apartmentNumber : "—"} · {deal.property.projectName || "—"}
                  </span>
                </div>
                <div className="min-w-0 text-[#000] text-[15px]">
                  <span className="truncate">{deal.customer.displayName || "—"}</span>
                </div>
                <div className="min-w-0 text-[#122C5E] text-sm opacity-80 sm:col-span-2 lg:col-span-1">
                  {deal.manager?.displayName ? (
                    <span className="truncate">{t("manager")}: {deal.manager.displayName}</span>
                  ) : (
                    <span className="text-[#122C5E]/50">—</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-[#122C5E] text-sm">
                    <span className="tabular-nums">{formatMoney(deal.paidAmount)}</span>
                    <span className="shrink-0 opacity-70">/ {formatMoney(deal.dealPrice)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#122C5E]/15">
                    <div
                      className="h-full rounded-full bg-[#1A3C7E] transition-all duration-300"
                      style={{
                        width: `${deal.dealPrice > 0 ? Math.min(100, (Number(deal.paidAmount) / Number(deal.dealPrice)) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <StatusBadge status={deal.dealStatus} />
                </div>
                <div className="flex items-center justify-end text-[#122C5E] text-sm">
                  {expandedId === deal.documentId ? "▲ " + t("collapse") : "▼ " + t("expand_list")}
                </div>
              </button>

              {expandedId === deal.documentId && (
                <div className="border-t border-[#122C5E]/10 bg-white/50 px-4 pb-5 pt-4 sm:px-5 lg:px-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <section className="min-w-0">
                      <h3 className="mb-2 text-[#122C5E] font-medium">{t("payment_schedule")}</h3>
                      <div className="overflow-x-auto rounded-[12px] border border-[#122C5E]/10 bg-white">
                        <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#122C5E]/15 bg-[#122C5E]/05">
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">№</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("due_date_short")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("amount")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("remainder")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("status_label")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deal.paymentSchedules.map((s, idx) => (
                              <tr key={s.documentId} className="border-b border-[#122C5E]/08 last:border-0">
                                <td className="px-3 py-2.5">{s.index}</td>
                                <td className="px-3 py-2.5">{formatDate(s.dueDate)}</td>
                                <td className="px-3 py-2.5 tabular-nums">{formatMoney(s.amount)}</td>
                                <td className="px-3 py-2.5 tabular-nums">
                                  {remainders[idx] > 0 ? (
                                    <span className="text-amber-700">{formatMoney(remainders[idx])}</span>
                                  ) : (
                                    <span className="text-emerald-600">0 ₸</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <StatusBadge status={s.paymentStatus} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <section className="min-w-0">
                      <h3 className="mb-2 text-[#122C5E] font-medium">{t("payments")}</h3>
                      <div className="overflow-x-auto rounded-[12px] border border-[#122C5E]/10 bg-white">
                        <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#122C5E]/15 bg-[#122C5E]/05">
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">№</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("amount")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("status_label")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("confirmed_at")}</th>
                              <th className="px-3 py-2.5 text-[#122C5E] font-medium opacity-90">{t("confirmed_by")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deal.payments.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-3 py-4 text-center text-[#122C5E] opacity-60">
                                  {t("no_payments")}
                                </td>
                              </tr>
                            ) : (
                              deal.payments.map((p) => {
                                const schedIdx = paymentToSchedule.get(p.documentId);
                                return (
                                  <tr key={p.documentId} className="border-b border-[#122C5E]/08 last:border-0">
                                    <td className="px-3 py-2.5 text-[#122C5E]">
                                      {schedIdx != null ? `№${schedIdx}` : "—"}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums">{formatMoney(p.amount)}</td>
                                    <td className="px-3 py-2.5">
                                      <StatusBadge status={p.paymentStatus} />
                                    </td>
                                    <td className="px-3 py-2.5">{formatDate(p.confirmedAt ?? p.createdAt)}</td>
                                    <td className="px-3 py-2.5">{p.confirmedByDisplayName ?? "—"}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  <div className="mt-4 rounded-[12px] border border-[#122C5E]/10 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#122C5E]">Договоры</span>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="rounded-[10px]"
                        isLoading={agreementLoadingDealId === deal.documentId}
                        isDisabled={agreementLoadingDealId !== null}
                        onPress={() => loadDealAgreements(deal.documentId)}
                      >
                        {(agreementsByDeal[deal.documentId] ?? []).length > 0 ? "Обновить договоры" : "Показать договоры"}
                      </Button>
                    </div>
                    {(agreementsByDeal[deal.documentId] ?? []).length > 0 ? (
                      <div className="mt-2 flex flex-col gap-1">
                        {(agreementsByDeal[deal.documentId] ?? []).map((a) => (
                          <a
                            key={`${deal.documentId}-${a.url}`}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#1A3C7E] underline underline-offset-2"
                            title={agreementLabel(a)}
                          >
                            {agreementLabel(a)}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[#122C5E]/60">Нажмите «Показать договоры», чтобы увидеть список файлов.</p>
                    )}
                  </div>

                  {confirmingDealId === deal.documentId ? (
                    <div className="mt-5 rounded-[16px] border border-[#122C5E]/12 bg-white p-4 sm:p-5">
                      <h3 className="mb-4 text-[#122C5E] font-medium">{t("confirm_payment")}</h3>
                      <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-sm font-medium text-[#122C5E] opacity-80">{t("schedule_position")}</label>
                          <select
                            className="w-full rounded-[10px] border border-[#122C5E]/25 bg-white px-3 py-2.5 text-[#122C5E] outline-none focus:ring-2 focus:ring-[#122C5E]/20"
                            value={scheduleId ?? ""}
                            onChange={(e) => {
                              setScheduleId(e.target.value || null);
                              const s = deal.paymentSchedules.find((x) => x.documentId === e.target.value);
                              if (s) setAmount(String(s.amount).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
                            }}
                          >
                            {deal.paymentSchedules
                              .filter((s) => SCHEDULE_CONFIRMABLE_STATUSES.includes(s.paymentStatus))
                              .map((s, idx) => {
                                const rem = remainders[deal.paymentSchedules.indexOf(s)];
                                return (
                                  <option key={s.documentId} value={s.documentId}>
                                    №{s.index} — {formatDate(s.dueDate)} — {formatMoney(s.amount)}
                                    {rem > 0 && rem < s.amount ? ` (остаток: ${formatMoney(rem)})` : ""}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-[#122C5E] opacity-80">{t("amount")} (₸)</label>
                          <Input
                            type="text"
                            value={amount}
                            onValueChange={(v) => {
                              const digits = v.replace(/\D/g, "");
                              if (!digits) { setAmount(""); return; }
                              setAmount(digits.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
                            }}
                            classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-10" }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-[#122C5E] opacity-80">
                            {t("receipt_file")} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="block w-full text-sm text-[#122C5E] file:rounded-[10px] file:border-0 file:bg-[#1A3C7E] file:px-4 file:py-2 file:text-white file:transition-colors hover:file:bg-[#122C5E]"
                            disabled={submittingPayment}
                            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                          />
                          {!receiptFile && (
                            <p className="mt-0.5 text-xs text-amber-600">{t("receipt_required_hint")}</p>
                          )}
                        </div>
                        {submitError && (
                          <p className="text-sm text-red-600 sm:col-span-2">{submitError}</p>
                        )}
                        {submittingPayment && (
                          <p className="text-sm text-[#122C5E] sm:col-span-2">
                            {t("loading")}...
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <Button
                            color="success"
                            className="rounded-[10px] text-white"
                            onPress={submitConfirm}
                            isLoading={submittingPayment}
                            isDisabled={submittingPayment || !receiptFile || receiptFile.size === 0}
                          >
                            {t("confirm_payment")}
                          </Button>
                          <Button
                            variant="flat"
                            className="rounded-[10px]"
                            onPress={cancelConfirm}
                            isDisabled={submittingPayment}
                          >
                            {t("cancel")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        className="rounded-[10px]"
                        onPress={() => startConfirm(deal)}
                        isDisabled={!deal.paymentSchedules.some((s) => SCHEDULE_CONFIRMABLE_STATUSES.includes(s.paymentStatus))}
                      >
                        {t("confirm_payment")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );})}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 rounded-[20px] bg-[#F4F6FB] px-4 py-3 sm:flex-row sm:gap-4">
            <p className="order-2 text-sm text-[#122C5E] opacity-80 sm:order-1">
              {t("pagination_page_of", { current: safePage, total: totalPages })} · {filteredDeals.length} {t("deals")}
            </p>
            <div className="order-1 flex items-center gap-2 sm:order-2">
              <Button
                size="sm"
                variant="flat"
                isDisabled={safePage <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                className="min-w-[36px] rounded-[10px]"
              >
                ←
              </Button>
              <span className="min-w-[4rem] text-center text-sm text-[#122C5E]">
                {safePage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="flat"
                isDisabled={safePage >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-w-[36px] rounded-[10px]"
              >
                →
              </Button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
