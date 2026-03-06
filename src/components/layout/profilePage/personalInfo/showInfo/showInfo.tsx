"use client";

import type { DocData } from "../types";
import { useTranslations } from "next-intl";

function formatIinDisplay(value: string | undefined): string {
  if (!value) return "—";
  const s = String(value).replace(/\D/g, "");
  return s.length === 12 ? s : value;
}

function formatDocValue(key: keyof DocData, value: string | undefined): string {
  if (value == null || value === "") return "—";
  if (key === "docIssuer" && String(value).toUpperCase().trim() === "МИНИСТЕРСТВО ВНУТРЕННИХ ДЕЛ РК") return "МВД РК";
  return String(value);
}

export default function ShowInfo({ docData }: { docData: DocData | null }) {
  const t = useTranslations();
  const ROWS: { key: keyof DocData; label: string }[] = [
    { key: "lastName", label: t("last_name") },
    { key: "firstName", label: t("first_name") },
    { key: "middleName", label: t("middle_name") },
    { key: "gender", label: t("gender") },
    { key: "dateOfBirth", label: t("date_of_birth") },
    { key: "docNumber", label: t("doc_number") },
    { key: "docIssuer", label: t("doc_issuer") },
    { key: "dateOfIssue", label: t("date_of_issue") },
  ];
  
  if (!docData) {
    return (
      <div className="flex flex-col items-start gap-[16px] self-stretch">
        <p className="text-[#000] text-[16px] not-italic font-normal leading-[20px] opacity-60">
          {t("document_data_not_filled")}
        </p>
      </div>
    );
  }

  const iin = docData.iin;

  return (
    <div className="flex flex-col items-start gap-[16px] self-stretch">
      <div className="flex pb-[8px] justify-between items-end self-stretch [border-bottom:1px_solid_rgba(0,_0,_0,_0.14)]">
        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">ИИН</span>
        <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatIinDisplay(iin)}</span>
      </div>
      {ROWS.map(({ key, label }) => (
        <div key={key} className="flex pb-[8px] justify-between items-end self-stretch [border-bottom:1px_solid_rgba(0,_0,_0,_0.14)]">
          <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{label}</span>
          <span className="text-[#000] text-[16px] not-italic font-normal leading-[16px]">{formatDocValue(key, docData[key] as string)}</span>
        </div>
      ))}
    </div>
  );
}
