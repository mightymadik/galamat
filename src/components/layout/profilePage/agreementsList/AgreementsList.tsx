"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@heroui/react";

const HIDDEN_DEAL_STATUSES = ["Отменен", "Бронь"];
const PAGE_SIZE = 10;

export interface AgreementRow {
  dealDocumentId: string;
  dealStatus: string;
  createdAt: string | null;
  customer: { name: string; surname: string; displayName: string };
  manager?: { displayName: string } | null;
  property: {
    projectName: string;
    apartmentNumber: string | number;
    type?: "property" | "commerce" | "parking" | "pantry";
    typeLabel?: string;
  };
  signedAgreement: { signed: boolean; signedAt: string | null } | null;
}

type DownloadAgreementItem = {
  url: string;
  name?: string;
  templateType?: string;
  agreementType?: string | null;
  agreementNumber?: string | null;
  signedAt?: string | null;
};

function agreementLabel(a: DownloadAgreementItem): string {
  const name = (a.name ?? "").trim();
  const type = (a.templateType ?? "").trim();
  const agreementNumber = (a.agreementNumber ?? "").trim();
  const byAgreementFields = `${type}${agreementNumber ? ` ${agreementNumber}` : ""}`.trim();
  if (byAgreementFields) return byAgreementFields;
  if (!name && !type) return "Договор";
  if (!name) return type;
  if (!type) return name;
  if (name.toLowerCase().includes(type.toLowerCase())) return name;
  if (name.toLowerCase() === "dogovor.pdf" || name.toLowerCase() === "договор.pdf") return type;
  return `${type} - ${name}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AgreementsList() {
  const t = useTranslations();
  const [list, setList] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [agreementsByDeal, setAgreementsByDeal] = useState<Record<string, DownloadAgreementItem[]>>({});
  const [filterClient, setFilterClient] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const [filterObject, setFilterObject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const loadAgreements = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/manager/agreements", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "manager_only" : "load_error");
        return res.json();
      })
      .then((json) => {
        setList(json.agreements ?? []);
      })
      .catch((err) => {
        setError(err?.message === "manager_only" ? t("manager_only_access") : err?.message === "load_error" ? t("load_error") : t("network_error"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  const visibleList = useMemo(
    () => list.filter((row) => !HIDDEN_DEAL_STATUSES.includes((row.dealStatus || "").trim())),
    [list]
  );

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    visibleList.forEach((row) => {
      const s = (row.dealStatus || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [visibleList]);

  const filteredList = useMemo(() => {
    const client = filterClient.trim().toLowerCase();
    const manager = filterManager.trim().toLowerCase();
    const object = filterObject.trim().toLowerCase();
    const status = filterStatus.trim();
    let result = visibleList;
    if (status) {
      result = result.filter((row) => (row.dealStatus || "").trim() === status);
    }
    if (!client && !manager && !object) return result;
    return result.filter((row) => {
      if (client && !(row.customer?.displayName ?? "").toLowerCase().includes(client)) return false;
      if (manager && !(row.manager?.displayName ?? "").toLowerCase().includes(manager)) return false;
      const projectName = (row.property?.projectName ?? "").toLowerCase();
      const apt = row.property?.apartmentNumber != null ? String(row.property.apartmentNumber).toLowerCase() : "";
      const type = (row.property?.typeLabel ?? "").toLowerCase();
      const objectStr = `${projectName} ${type} ${apt}`.trim();
      if (object && !objectStr.includes(object)) return false;
      return true;
    });
  }, [visibleList, filterClient, filterManager, filterObject, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = useMemo(
    () => filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredList, safePage]
  );

  useEffect(() => {
    setPage((p) => (p > totalPages ? Math.max(1, totalPages) : p));
  }, [totalPages]);

  const handleDownload = async (dealDocumentId: string) => {
    setDownloadingId(dealDocumentId);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/signed-agreement`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const agreements: DownloadAgreementItem[] = Array.isArray(json?.agreements)
        ? json.agreements.filter((a: unknown): a is DownloadAgreementItem => !!a && typeof (a as DownloadAgreementItem).url === "string")
        : [];
      if (agreements.length > 0) {
        setAgreementsByDeal((prev) => ({ ...prev, [dealDocumentId]: agreements }));
      } else if (res.status === 404) {
        alert(t("agreement_not_found_or_not_ready"));
      } else {
        alert(json?.error ?? t("failed_to_get_agreement"));
      }
    } catch {
      alert(t("load_error"));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("agreements")}</h1>
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full max-w-[1600px] flex-col gap-6">
        <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("agreements")}</h1>
        <p className="text-red-600">{error}</p>
        <Button size="sm" variant="flat" color="primary" onPress={loadAgreements}>{t("refresh")}</Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-6">
      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[#000] text-2xl lg:text-3xl font-medium">{t("agreements")}</h1>
          <p className="text-[#122C5E] text-base opacity-80 mt-1">
            {t("agreements_description")}
          </p>
        </div>
        <Button size="sm" variant="flat" color="primary" onPress={loadAgreements} isDisabled={loading}>
          {t("refresh")}
        </Button>
      </div>

      {visibleList.length > 0 && (
        <div className="rounded-[20px] border border-[#122C5E]/10 bg-white/80 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_minmax(160px,1fr)_auto] lg:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_client")}</label>
              <Input
                size="sm"
                value={filterClient}
                onValueChange={(v) => { setFilterClient(v); setPage(1); }}
                placeholder={t("filter_client_placeholder")}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_manager")}</label>
              <Input
                size="sm"
                value={filterManager}
                onValueChange={(v) => { setFilterManager(v); setPage(1); }}
                placeholder={t("filter_manager_placeholder")}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_object")}</label>
              <Input
                size="sm"
                value={filterObject}
                onValueChange={(v) => { setFilterObject(v); setPage(1); }}
                placeholder={t("filter_object_placeholder")}
                classNames={{ input: "rounded-[10px]", inputWrapper: "min-h-9" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#122C5E] opacity-80">{t("filter_by_deal_status")}</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="min-h-9 w-full rounded-[10px] border border-[#122C5E]/25 bg-white px-3 py-2 text-sm text-[#122C5E] outline-none focus:ring-2 focus:ring-[#122C5E]/20"
              >
                <option value="">{t("filter_status_all")}</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="flat"
              className="shrink-0 self-end rounded-[10px] lg:self-auto"
              onPress={() => { setFilterClient(""); setFilterManager(""); setFilterObject(""); setFilterStatus(""); setPage(1); }}
            >
              {t("reset")}
            </Button>
          </div>
        </div>
      )}

      {visibleList.length === 0 ? (
        <div className="rounded-[32px] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#122C5E] opacity-70">{t("no_deals")}</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-[32px] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#122C5E] opacity-70">{t("no_deals_match_filters")}</p>
          <Button size="sm" variant="flat" color="primary" className="mt-2" onPress={() => { setFilterClient(""); setFilterManager(""); setFilterObject(""); setFilterStatus(""); setPage(1); }}>
            {t("reset")}
          </Button>
        </div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-[32px] bg-[#F4F6FB] p-6">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-[#122C5E]/20">
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80">{t("client")}</th>
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80">{t("manager")}</th>
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80">{t("object")}</th>
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80">{t("deal_status")}</th>
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80">{t("contract")}</th>
                <th className="p-4 text-[#122C5E] text-sm font-medium opacity-80 w-[140px]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((row) => (
                <tr key={row.dealDocumentId} className="border-b border-[#122C5E]/10 last:border-0">
                  <td className="p-4 text-[#000] text-[15px]">{row.customer.displayName || "—"}</td>
                  <td className="p-4 text-[#000] text-[15px]">{row.manager?.displayName || "—"}</td>
                  <td className="p-4 text-[#000] text-[15px]">
                    {(row.property.typeLabel || (row.property.type === "property" ? "Квартира" : "Объект"))} №
                    {row.property.apartmentNumber != null && row.property.apartmentNumber !== ""
                      ? row.property.apartmentNumber
                      : "—"}
                    {` · ${row.property.projectName || "—"}`}
                  </td>
                  <td className="p-4">
                    <span className="text-[#122C5E] text-[15px]">{row.dealStatus || "—"}</span>
                  </td>
                  <td className="p-4 text-[#000] text-[15px]">
                    {row.signedAgreement?.signed
                      ? `${t("signed")}${row.signedAgreement.signedAt ? ` ${formatDate(row.signedAgreement.signedAt)}` : ""}`
                      : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="rounded-[12px]"
                        isLoading={downloadingId === row.dealDocumentId}
                        isDisabled={downloadingId !== null}
                        onPress={() => handleDownload(row.dealDocumentId)}
                      >
                        {agreementsByDeal[row.dealDocumentId]?.length ? "Обновить список" : t("download")}
                      </Button>
                      {(agreementsByDeal[row.dealDocumentId] ?? []).map((a) => (
                        <a
                          key={`${row.dealDocumentId}-${a.url}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 rounded-[20px] bg-[#F4F6FB] px-4 py-3 sm:flex-row sm:gap-4">
            <p className="order-2 text-sm text-[#122C5E] opacity-80 sm:order-1">
              {t("pagination_page_of", { current: safePage, total: totalPages })} · {filteredList.length} {t("deals")}
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

