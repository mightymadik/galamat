"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import type { DealFull } from "./types";

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DealModal({
  dealDocumentId,
  onClose,
  onUpdated,
}: {
  dealDocumentId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [data, setData] = useState<DealFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/full`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Сделка не найдена" : "Ошибка загрузки");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Ошибка");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dealDocumentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-red-600">{error ?? "Нет данных"}</p>
          <Button className="mt-4" onPress={onClose}>Закрыть</Button>
        </div>
      </div>
    );
  }

  const { deal, paymentSchedules, payments, signedAgreement } = data;
  const customer = deal.customer;
  const property = deal.property;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Сделка № {deal.documentId}</h2>
          <Button size="sm" variant="light" onPress={onClose}>Закрыть</Button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Квартира</h3>
            <p className="font-medium">{property?.projectName ?? "—"}, кв. {property?.apartmentNumber ?? "—"}</p>
            <p className="text-sm text-gray-600">
              Сумма: {formatPrice(deal.dealPrice)} · Статус: {deal.dealStatus}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Клиент</h3>
            <p>
              {[customer?.surname, customer?.name].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="text-sm text-gray-600">{customer?.phone ?? "—"}</p>
            {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-2">График платежей</h3>
            {paymentSchedules.length === 0 ? (
              <p className="text-sm text-gray-500">Нет записей</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">№</th>
                      <th className="text-left py-2">Дата</th>
                      <th className="text-right py-2">Сумма</th>
                      <th className="text-left py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedules.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5">{row.index}</td>
                        <td>{formatDate(row.dueDate)}</td>
                        <td className="text-right">{formatPrice(row.amount)}</td>
                        <td>{row.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Платежи</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500">Нет записей</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{formatPrice(p.amount)}</span>
                    <span>{p.paymentStatus} · {formatDate(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Договор</h3>
            <p className="text-sm">
              {signedAgreement?.signed ? "Подписан" + (signedAgreement.signedAt ? ` ${formatDate(signedAgreement.signedAt)}` : "") : "Не подписан"}
            </p>
          </section>

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button size="sm" color="primary" onPress={() => { onUpdated?.(); onClose(); }}>
              Продолжить оформление
            </Button>
            <Button size="sm" variant="bordered" onPress={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
