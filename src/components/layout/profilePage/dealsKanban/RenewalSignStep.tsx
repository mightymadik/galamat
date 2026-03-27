"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import type { DealFull } from "./types";
import { useTranslations } from "next-intl";

function formatSignedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

function formatPrice(input: unknown): string {
  if (input == null) return "—";
  let s = String(input).replace(/\u00A0/g, "").replace(/\s/g, "").replace(/₸/g, "");
  if (!/^\d+$/.test(s)) return "—";
  const parts: string[] = [];
  while (s.length > 3) {
    parts.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }
  if (s) parts.unshift(s);
  return parts.join(" ") + " ₸";
}

export function RenewalSignStep({
  dealDocumentId,
  data,
  newCustomerDocumentId,
  typedSum,
  planImage,
  onComplete,
}: {
  dealDocumentId: string;
  data: DealFull;
  newCustomerDocumentId: string;
  typedSum: number;
  planImage: string | null;
  onComplete: () => void;
}) {
  const t = useTranslations();
  const [sendingToSign, setSendingToSign] = useState(false);
  const [sentToSign, setSentToSign] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [doodocsDocumentId, setDoodocsDocumentId] = useState<string | null>(null);
  const [signedAgreementDocumentId, setSignedAgreementDocumentId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const projectDocumentId = data?.deal?.property?.projectDocumentId ?? null;
  const isSigned = Boolean(signedAt);

  const handleSendToSign = async () => {
    setSignError(null);
    setSendingToSign(true);
    try {
      const genRes = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/renewal/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newCustomerDocumentId, typedSum }),
      });
      const genJson = await genRes.json().catch(() => ({}));
      if (!genRes.ok) {
        setSignError(genJson?.error ?? "Ошибка генерации");
        setSendingToSign(false);
        return;
      }
      const fileUrl = genJson?.fileUrl;
      const agreementNumber = genJson?.agreementNumber ?? "";
      setSignedAgreementDocumentId(genJson?.signedAgreementDocumentId ?? null);
      if (!fileUrl || !projectDocumentId) {
        setSignError("Нет fileUrl или projectDocumentId");
        setSendingToSign(false);
        return;
      }
      const prevCust = data?.deal?.customer;
      const prevEmail = (prevCust?.email ?? "").trim();
      const prevIin = String(prevCust?.iin ?? "").replace(/\D/g, "").padStart(12, "0").slice(-12);
      const custRes = await fetch(`/api/manager/customers?documentId=${encodeURIComponent(newCustomerDocumentId)}`, { credentials: "include" });
      const custJson = await custRes.json().catch(() => ({}));
      const custList = custJson?.customers ?? [];
      const currentCust = custList[0];
      const currEmail = (currentCust?.email ?? "").trim();
      const currIin = String(currentCust?.iin ?? "").replace(/\D/g, "").padStart(12, "0").slice(-12);
      if (!prevEmail || prevIin.length !== 12 || !currEmail || currIin.length !== 12) {
        setSignError("У обоих клиентов должны быть заполнены email и ИИН (12 цифр)");
        setSendingToSign(false);
        return;
      }
      const sendRes = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/renewal/send-to-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileUrl,
          projectDocumentId,
          previousClientEmail: prevEmail,
          previousClientIin: prevIin,
          currentClientEmail: currEmail,
          currentClientIin: currIin,
          contractName: agreementNumber ? `Переоформление ${agreementNumber.replace(/\//g, "-")}` : "Переоформление",
        }),
      });
      const sendJson = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        setSignError(sendJson?.error ?? "Ошибка отправки на подпись");
        setSendingToSign(false);
        return;
      }
      setDoodocsDocumentId(sendJson?.documentId ?? null);
      setSignUrl(sendJson?.signUrl ?? null);
      setSentToSign(true);
    } catch {
      setSignError("Ошибка сети");
    } finally {
      setSendingToSign(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!doodocsDocumentId) return;
    setSignError(null);
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/renewal/check-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ doodocsDocumentId, signedAgreementDocumentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.signed) {
        setSignedAt(json?.signedAt ?? new Date().toISOString());
      } else if (!res.ok) {
        setSignError(json?.error ?? "Ошибка проверки");
      } else {
        setSignError("Документ ещё не подписан всеми участниками");
      }
    } catch {
      setSignError("Ошибка сети");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleComplete = async () => {
    setSignError(null);
    setCompleting(true);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(dealDocumentId)}/renewal/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newCustomerDocumentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSignError(json?.error ?? "Ошибка переоформления");
        return;
      }
      onComplete();
    } catch {
      setSignError("Ошибка сети");
    } finally {
      setCompleting(false);
    }
  };

  const prop = data?.deal?.property;
  const propertyType = prop?.type ?? data?.deal?.realEstateType ?? "property";
  const propertyTypeLabelMap: Record<"property" | "commerce" | "parking" | "pantry", string> = {
    property: "Квартира",
    commerce: "Коммерция",
    parking: "Паркинг",
    pantry: "Кладовка",
  };
  const objectTypeLabel = prop?.typeLabel ?? propertyTypeLabelMap[propertyType];
  const propertyMetaLabel =
    propertyType === "property"
      ? Number(prop?.room ?? 0) > 0
        ? `${prop?.room} комнатная`
        : objectTypeLabel
      : objectTypeLabel;
  const dealPrice = data?.deal?.dealPrice;

  return (
    <div className="flex flex-col items-start gap-6 self-stretch">
      <div className="flex w-full max-h-[168px] p-4 flex-col gap-2 self-stretch rounded-[32px] bg-[#F4F6FB]">
        <div className="flex justify-between items-center gap-4">
          {planImage ? (
            <div className="relative w-[130px] h-[116px] rounded-2xl bg-white overflow-hidden shrink-0">
              <Image src={planImage} alt="Планировка" fill className="object-cover" unoptimized />
            </div>
          ) : <div className="w-[130px] h-[116px] bg-gray-200 rounded-[12px] flex items-center justify-center p-1">
            <span className="text-gray-500 text-center">{t("no_image")}</span>
          </div>}
          <div className="flex flex-1 flex-col justify-between items-start min-w-0">
            <div className="flex justify-between items-center self-stretch">
              <h1 className="text-[#000] text-xl font-medium leading-6 truncate">{prop?.projectName ?? "—"}</h1>
              <span className="text-[#000] text-base opacity-30">№{prop?.apartmentNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center self-stretch">
              <span className="text-[#000] text-base">{propertyMetaLabel}</span>
              <span className="text-[#000] text-base">{prop?.totalArea ?? "—"} м²</span>
            </div>
            <div className="text-[#2655AF] text-xl font-medium">
              {dealPrice != null ? formatPrice(dealPrice) : "—"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7E7E7E" strokeWidth="1.5">
          <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z" />
          <path d="M16 10l-4 4-2-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[#122C5E] text-base">Подписать договор переоформления</span>
      </div>
      {sentToSign && !signedAt && (
        <p className="text-[#2655AF] text-sm">
          Документ отправлен на подписание. После подписания всеми нажмите «Обновить статус».
        </p>
      )}
      {signedAt && (
        <p className="text-[#2655AF] text-sm">Документ подписан {formatSignedAt(signedAt)}.</p>
      )}
      {signError && <p className="text-red-600 text-sm">{signError}</p>}
      {sendingToSign && (
        <p className="text-[#7E7E7E] text-[13px]">Обычно это занимает 20–40 секунд. Не закрывайте страницу.</p>
      )}
      <div className="flex flex-col gap-3 self-stretch">
        {!sentToSign && (
          <Button
            onPress={handleSendToSign}
            isDisabled={sendingToSign}
            isLoading={sendingToSign}
            className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
          >
            <span className="text-white text-[15px] font-medium">
              {sendingToSign ? "Отправка…" : "Сформировать и отправить на подпись"}
            </span>
          </Button>
        )}
        {signUrl && (
          <Button
            as="a"
            href={signUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="bordered"
            className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] border-[#1A3C7E]"
          >
            <span className="text-[#1A3C7E] text-[15px] font-medium">Открыть ссылку для подписания</span>
          </Button>
        )}
        {sentToSign && !signedAt && doodocsDocumentId && (
          <Button
            onPress={handleCheckStatus}
            isDisabled={checkingStatus}
            isLoading={checkingStatus}
            className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
          >
            <span className="text-white text-[15px] font-medium">
              {checkingStatus ? "Проверка…" : "Обновить статус"}
            </span>
          </Button>
        )}
        <Button
          onPress={handleComplete}
          isDisabled={completing || !signedAt}
          className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#DB1D31] disabled:opacity-50"
        >
          <span className="text-white text-[15px] font-medium">
            {completing ? "Загрузка…" : !signedAt ? "Сначала подпишите документ" : "Переписать сделку на нового клиента"}
          </span>
        </Button>
      </div>
    </div>
  );
}
