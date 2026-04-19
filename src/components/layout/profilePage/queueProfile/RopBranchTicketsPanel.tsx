"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectItem, Spinner } from "@heroui/react";
import { useAppSelector } from "@/store/hooks";
import { getManagerProfile } from "./api/queueManagerApi";
import type { RedirectOption } from "./types";

const FILTER_ALL = "__all__";

const TICKET_STATUSES = [
  "WAITING",
  "CALLED",
  "SERVING",
  "DONE",
  "NO_SHOW",
  "TRANSFERRED",
  "CANCELLED",
] as const;

function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type BranchTicketRow = {
  id: string;
  ticketCode?: string;
  status?: string;
  createdAt?: string;
  service?: { id?: string; name?: string | null; code?: string | null } | null;
  client?: { fullName?: string | null; phone?: string | null } | null;
  manager?: { id?: string; fullName?: string | null } | null;
};

export default function RopBranchTicketsPanel() {
  const t = useTranslations();
  const userRole = String(useAppSelector((s) => s.auth.user?.role ?? "")).toLowerCase();
  const canForceTicketStatus = userRole === "rop" || userRole === "admin";
  const today = localYmd();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [services, setServices] = useState<RedirectOption[]>([]);
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BranchTicketRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualStatuses, setManualStatuses] = useState<Record<string, "DONE" | "CANCELLED" | "NO_SHOW">>({});
  const [manualActionLoadingById, setManualActionLoadingById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBranchLoading(true);
      const r = await getManagerProfile();
      if (cancelled) return;
      const id = r.data?.branch?.id ? String(r.data.branch.id) : null;
      setBranchId(id);
      setBranchLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) {
      setServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/queue/services?branchId=${encodeURIComponent(branchId)}`,
          { credentials: "include" },
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) {
          if (!cancelled) setServices([]);
          return;
        }
        const list = (json as { services?: RedirectOption[] }).services ?? [];
        setServices(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setServices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setManagers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/queue/managers?branchId=${encodeURIComponent(branchId)}&includeOffline=1`,
          { credentials: "include" },
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) {
          if (!cancelled) setManagers([]);
          return;
        }
        const list = (json as { managers?: Array<{ id: string; name: string }> }).managers ?? [];
        setManagers(
          Array.isArray(list)
            ? list.map((m) => ({ id: String(m.id), name: String(m.name ?? m.id) }))
            : [],
        );
      } catch {
        if (!cancelled) setManagers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate.trim()) params.set("startDate", startDate.trim());
      if (endDate.trim()) params.set("endDate", endDate.trim());
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      if (serviceId.trim()) params.set("serviceId", serviceId.trim());
      if (managerId.trim()) params.set("managerId", managerId.trim());
      params.set("page", String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/queue/manager/branch-tickets?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof (json as { error?: string; message?: string }).message === "string"
            ? (json as { message: string }).message
            : typeof (json as { error?: string }).error === "string"
              ? (json as { error: string }).error
              : t("queue_rop_all_tickets_load_error");
        setError(msg);
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      const data = (json as { data?: BranchTicketRow[]; pages?: number; total?: number }).data ?? [];
      const pages = Math.max(1, Number((json as { pages?: number }).pages) || 1);
      const tot = Number((json as { total?: number }).total) || 0;
      setRows(Array.isArray(data) ? data : []);
      setTotalPages(pages);
      setTotal(tot);
    } catch {
      setError(t("queue_rop_all_tickets_load_error"));
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, serviceId, managerId, page, t]);

  const onApplyManualStatus = useCallback(
    async (ticketId: string) => {
      const status = manualStatuses[ticketId] ?? "DONE";
      setManualActionLoadingById((prev) => ({ ...prev, [ticketId]: true }));
      try {
        const res = await fetch("/api/queue/manager/force-ticket-status", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, status }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof (json as { message?: string }).message === "string"
              ? (json as { message: string }).message
              : t("queue_rop_all_tickets_load_error");
          setError(msg);
          return;
        }
        setManualStatuses((prev) => {
          const next = { ...prev };
          delete next[ticketId];
          return next;
        });
        await loadTickets();
      } catch {
        setError(t("queue_rop_all_tickets_load_error"));
      } finally {
        setManualActionLoadingById((prev) => ({ ...prev, [ticketId]: false }));
      }
    },
    [manualStatuses, loadTickets, t],
  );

  useEffect(() => {
    if (branchLoading || !branchId) return;
    void loadTickets();
  }, [branchId, branchLoading, loadTickets]);

  const formatDt = (raw: string | undefined) => {
    if (!raw) return "—";
    const d = Date.parse(raw);
    if (!Number.isFinite(d)) return "—";
    return new Date(d).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel = (s: string | undefined) => {
    if (!s) return "—";
    return t(`queue_ticket_status_${s}` as never);
  };

  if (branchLoading) {
    return (
      <div className="flex w-full min-h-[240px] items-center justify-center rounded-[32px] bg-[#F4F6FB]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="flex w-full flex-col gap-[12px] rounded-[32px] bg-[#F4F6FB] p-[24px]">
        <p className="text-[#1E1E1E] text-[16px]">{t("queue_error_loading_queue")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[24px] rounded-[32px] bg-[#F4F6FB] p-[24px] lg:p-[32px]">
      <div className="flex flex-col gap-[8px]">
        <h1 className="text-[#1E1E1E] text-[22px] not-italic font-medium leading-[28px]">
          {t("queue_rop_all_tickets_title")}
        </h1>
        <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] leading-[normal]">
          {t("queue_rop_all_tickets_hint")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-[6px]">
          <span className="text-[#1A3C7E] text-[13px] font-medium">{t("queue_rop_all_tickets_date_from")}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="h-[48px] rounded-[14px] border border-[rgba(26,60,126,0.15)] bg-white px-[14px] text-[#1E1E1E] text-[15px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[#1A3C7E] text-[13px] font-medium">{t("queue_rop_all_tickets_date_to")}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="h-[48px] rounded-[14px] border border-[rgba(26,60,126,0.15)] bg-white px-[14px] text-[#1E1E1E] text-[15px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[#1A3C7E] text-[13px] font-medium">{t("queue_rop_all_tickets_filter_status")}</span>
          <Select
            items={[
              { id: FILTER_ALL, name: t("queue_rop_all_tickets_status_all") },
              ...TICKET_STATUSES.map((st) => ({ id: st, name: statusLabel(st) })),
            ]}
            selectedKeys={[statusFilter || FILTER_ALL]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              const s = key != null ? String(key) : FILTER_ALL;
              setStatusFilter(s === FILTER_ALL ? "" : s);
              setPage(1);
            }}
            classNames={{
              base: "w-full",
              trigger:
                "h-[48px] min-h-[48px] rounded-[14px] border border-[rgba(26,60,126,0.15)] bg-white px-[14px] py-0 text-[#1E1E1E] text-[15px]",
              value: "w-full h-full flex items-center justify-center",
              listboxWrapper: "max-h-[280px] overflow-y-auto",
              listbox: "",
            }}
          >
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[#1A3C7E] text-[13px] font-medium">{t("queue_rop_all_tickets_filter_service")}</span>
          <Select
            items={[
              { id: FILTER_ALL, name: t("queue_rop_all_tickets_service_all") },
              ...services.map((svc) => ({ id: svc.id, name: svc.name })),
            ]}
            selectedKeys={[serviceId || FILTER_ALL]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              const s = key != null ? String(key) : FILTER_ALL;
              setServiceId(s === FILTER_ALL ? "" : s);
              setPage(1);
            }}
            classNames={{
              base: "w-full",
              trigger:
                "h-[48px] min-h-[48px] rounded-[14px] border border-[rgba(26,60,126,0.15)] bg-white px-[14px] py-0 text-[#1E1E1E] text-[15px]",
              value: "w-full h-full flex items-center justify-center",
              listboxWrapper: "max-h-[280px] overflow-y-auto",
              listbox: "",
            }}
          >
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
        </label>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[#1A3C7E] text-[13px] font-medium">{t("queue_rop_all_tickets_filter_manager")}</span>
          <Select
            items={[
              { id: FILTER_ALL, name: t("queue_rop_all_tickets_manager_all") },
              ...managers,
            ]}
            selectedKeys={[managerId || FILTER_ALL]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              const s = key != null ? String(key) : FILTER_ALL;
              setManagerId(s === FILTER_ALL ? "" : s);
              setPage(1);
            }}
            classNames={{
              base: "w-full",
              trigger:
                "h-[48px] min-h-[48px] rounded-[14px] border border-[rgba(26,60,126,0.15)] bg-white px-[14px] py-0 text-[#1E1E1E] text-[15px]",
              value: "w-full h-full flex items-center justify-center",
              listboxWrapper: "max-h-[280px] overflow-y-auto",
              listbox: "",
            }}
          >
            {(item) => <SelectItem key={item.id}>{item.name}</SelectItem>}
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <Button
          className="rounded-[14px] bg-[#1A3C7E] px-[20px] text-white"
          onPress={() => void loadTickets()}
          isDisabled={loading}
          isLoading={loading}
        >
          {t("queue_rop_all_tickets_refresh")}
        </Button>
        {total > 0 ? (
          <span className="text-[rgba(7,_7,_31,_0.48)] text-[14px]">
            {t("queue_rop_all_tickets_total", { count: total })}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-[#DB1D31] text-[14px]">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-[20px] border border-[rgba(26,60,126,0.08)] bg-white">
        <table className="min-w-[900px] w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-[rgba(26,60,126,0.12)] bg-[rgba(244,246,251,0.6)]">
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_code")}
              </th>
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_created")}
              </th>
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_client")}
              </th>
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_service")}
              </th>
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_manager")}
              </th>
              <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                {t("queue_rop_all_tickets_col_status")}
              </th>
              {canForceTicketStatus ? (
                <th className="px-[14px] py-[12px] font-medium text-[#1A3C7E]">
                  {t("queue_confirm")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={canForceTicketStatus ? 7 : 6}
                  className="px-[14px] py-[28px] text-center text-[rgba(7,_7,_31,_0.48)]"
                >
                  {t("queue_rop_all_tickets_empty")}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[rgba(26,60,126,0.06)] last:border-b-0"
              >
                <td className="px-[14px] py-[12px] text-[#1E1E1E] font-medium">
                  {row.ticketCode ?? row.id.slice(0, 8)}
                </td>
                <td className="px-[14px] py-[12px] text-[#1E1E1E] whitespace-nowrap">
                  {formatDt(row.createdAt)}
                </td>
                <td className="px-[14px] py-[12px] text-[#1E1E1E]">
                  {row.client?.fullName?.trim() || "—"}
                </td>
                <td className="px-[14px] py-[12px] text-[#1E1E1E]">
                  {row.service?.name?.trim() || row.service?.code?.trim() || "—"}
                </td>
                <td className="px-[14px] py-[12px] text-[#1E1E1E]">
                  {row.manager?.fullName?.trim() || "—"}
                </td>
                <td className="px-[14px] py-[12px] text-[#1E1E1E]">{statusLabel(row.status)}</td>
                {canForceTicketStatus ? (
                  <td className="px-[14px] py-[12px] text-[#1E1E1E]">
                    {row.status === "WAITING" || row.status === "CALLED" || row.status === "SERVING" ? (
                      <div className="flex items-center gap-[8px]">
                        <select
                          value={manualStatuses[row.id] ?? "DONE"}
                          onChange={(e) =>
                            setManualStatuses((prev) => ({
                              ...prev,
                              [row.id]: e.target.value as "DONE" | "CANCELLED" | "NO_SHOW",
                            }))
                          }
                          className="h-[34px] rounded-[10px] border border-[rgba(26,60,126,0.15)] px-[10px] text-[13px]"
                        >
                          <option value="DONE">{statusLabel("DONE")}</option>
                          <option value="CANCELLED">{statusLabel("CANCELLED")}</option>
                          <option value="NO_SHOW">{statusLabel("NO_SHOW")}</option>
                        </select>
                        <Button
                          size="sm"
                          className="bg-[#1A3C7E] text-white"
                          isLoading={Boolean(manualActionLoadingById[row.id])}
                          onPress={() => void onApplyManualStatus(row.id)}
                        >
                          {t("queue_confirm")}
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <span className="text-[14px] text-[#1E1E1E]">
            {t("queue_rop_all_tickets_page", { page, pages: totalPages })}
          </span>
          <div className="flex gap-[8px]">
            <Button
              size="sm"
              variant="bordered"
              className="border-[#1A3C7E] text-[#1A3C7E]"
              isDisabled={page <= 1 || loading}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("queue_rop_all_tickets_prev")}
            </Button>
            <Button
              size="sm"
              variant="bordered"
              className="border-[#1A3C7E] text-[#1A3C7E]"
              isDisabled={page >= totalPages || loading}
              onPress={() => setPage((p) => p + 1)}
            >
              {t("queue_rop_all_tickets_next")}
            </Button>
          </div>
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-[32px]">
          <Spinner size="lg" />
        </div>
      ) : null}
    </div>
  );
}
