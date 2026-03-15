"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useDispatch } from "react-redux";
import {
  setAgreementFileUrl,
  setAgreementTemplateType,
  setAgreementNumber,
} from "@/store/paySlice";
import type { AgreementPayload } from "@/types/agreement";
import { useTranslations } from "next-intl";

interface ContractNumberFlatData {
  id?: string | number;
  documentId?: string;
  projectDocumentId?: string;
  title?: string;
  section?: string;
  floor?: string;
  room?: string;
  area?: string;
  apartmentNumber?: number;
  plan?: string;
  hasDdu?: boolean;
}

interface ContractNumberProps {
  flatData: ContractNumberFlatData | null;
  agreementPayload: AgreementPayload | null;
  dealDocumentId: string | null;
  onNext: () => void;
}

const inputClassNames = {
  base: "bg-[#F4F6FB] rounded-[16px] px-[16px] py-[8px]",
  label: "text-[#2655AF] text-[14px] opacity-20 leading-[14px] pb-[8px]",
  input: "!text-[#2655AF] text-[20px] font-medium leading-[24px]",
  inputWrapper:
    "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
  innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
};

export default function ContractNumber({
  flatData,
  agreementPayload,
  dealDocumentId,
  onNext,
}: ContractNumberProps) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const [ddunum, setDdunum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const num = ddunum.trim();
    if (!num) {
      setError(t("contract_number_required"));
      return;
    }
    if (!agreementPayload || (!flatData?.projectDocumentId && !dealDocumentId)) {
      setError(t("error_generating_agreement"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const genRes = await fetch("/api/signed-agreements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatData: flatData ?? undefined,
          agreementPayload,
          templateType: flatData?.hasDdu !== false ? "ddu" : "pdb",
          dealDocumentId: dealDocumentId ?? undefined,
          ddunum: num,
        }),
        credentials: "include",
      });
      const genJson = await genRes.json().catch(() => ({}));
      if (!genRes.ok) {
        const errMsg =
          genJson?.detail ?? genJson?.message ?? genJson?.error ?? t("error_generating_agreement");
        setError(errMsg);
        setLoading(false);
        return;
      }
      if (genJson?.fileUrl) {
        dispatch(setAgreementFileUrl(genJson.fileUrl));
      }
      if (genJson?.templateType === "pdb" || genJson?.templateType === "ddu") {
        dispatch(setAgreementTemplateType(genJson.templateType));
      }
      if (genJson?.agreementNumber != null) {
        dispatch(setAgreementNumber(genJson.agreementNumber));
      }
      onNext();
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 self-stretch">
      <p className="text-[#122C5E] text-[16px] not-italic font-normal leading-[24px] opacity-80">
        {t("contract_number_step_description")}
      </p>
      <Input
        label={t("contract_number")}
        placeholder={t("contract_number_placeholder")}
        value={ddunum}
        onValueChange={setDdunum}
        classNames={inputClassNames}
        isDisabled={loading}
        aria-label={t("contract_number")}
      />
      {error && (
        <p className="text-red-600 text-[14px] not-italic font-normal">{error}</p>
      )}
      <Button
        onPress={handleGenerate}
        isLoading={loading}
        isDisabled={loading || !ddunum.trim()}
        className="flex h-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
      >
        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
          {loading ? t("saving") : t("generate_contract")}
        </span>
      </Button>
    </div>
  );
}
