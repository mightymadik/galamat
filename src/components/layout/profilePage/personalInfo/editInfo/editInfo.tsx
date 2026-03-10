"use client";

import React, { useState, useRef } from "react";
import { Button, Input } from "@heroui/react";
import { withMask } from "use-mask-input";
import OtpInputs from "@/components/common/payModal/contacts/otpInputs";
import type { DocData } from "../types";
import { normalizePhone } from "@/lib/authOtp";
import { useTranslations } from "next-intl";

function phoneToRequestFormat(phone: string): string {
  return normalizePhone(phone || "").replace(/^\+/, "");
}

function formatDateApiToDisplay(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!d || !m || !y) return iso;
  return `${d}.${m}.${y}`;
}

function parseBiometricResponse(data: any): DocData {
  const common = data?.result_json?.common ?? {};
  const owner = common?.docOwner ?? {};
  const issuer = common?.docIssuer ?? {};
  const extra = data?.extra ?? {};

  const genderRaw = (data?.gender ?? "").toString().toLowerCase();
  const gender =
    genderRaw === "male" ? "Мужской" : genderRaw === "female" ? "Женский" : data?.gender ?? "";

  return {
    lastName: owner?.lastName ?? "",
    firstName: owner?.firstName ?? "",
    middleName: owner?.middleName ?? "",
    gender,
    dateOfBirth: formatDateApiToDisplay(extra?.date_of_birth),
    docNumber: common?.docNumber ?? "",
    docIssuer: issuer?.nameRu ?? issuer?.nameEn ?? "",
    dateOfIssue: formatDateApiToDisplay(extra?.date_of_issue),
    phone: "",
  };
}

interface EditInfoProps {
  docData: DocData | null;
  userPhone: string;
  onClose: () => void;
  onSaved: () => void;
}

type Step = "form" | "otp_check" | "otp_biometric";

export default function EditInfo({ docData, userPhone, onClose, onSaved }: EditInfoProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("form");
  const [showBiometricForm, setShowBiometricForm] = useState(false);
  const [iin, setIin] = useState("");
  const [phone, setPhone] = useState(userPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [pendingCheckDocData, setPendingCheckDocData] = useState<DocData | null>(null);
  const requestInFlight = useRef(false);

  const trimmedIin = iin.trim();
  const normalizedIin = trimmedIin.replace(/\D/g, "");
  const trimmedPhone = phone.trim();

  const requestDocData = async () => {
    if (requestInFlight.current || !trimmedIin || normalizedIin.length !== 12 || !trimmedPhone) return;
    requestInFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      // Если пользователь нажал «Обновить по биометрии» (docData уже есть), сразу идём в биометрику, не проверяем нашу систему
      const useBiometricOnly = !!docData;
      if (!useBiometricOnly) {
        const checkRes = await fetch("/api/customer/check-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneToRequestFormat(trimmedPhone),
            iin: trimmedIin,
          }),
          credentials: "include",
        });
        const checkJson = await checkRes.json().catch(() => ({}));

        if (checkRes.ok && checkJson?.found && checkJson?.data) {
          const d = checkJson.data;
          const data: DocData = {
            lastName: d.lastName ?? "",
            firstName: d.firstName ?? "",
            middleName: d.middleName ?? "",
            gender: d.gender ?? "",
            dateOfBirth: d.dateOfBirth ?? "",
            docNumber: d.docNumber ?? "",
            docIssuer: d.docIssuer ?? "",
            dateOfIssue: d.dateOfIssue ?? "",
            phone: d.phone ?? trimmedPhone,
          };
          setPendingCheckDocData(data);
          const sendRes = await fetch("/api/auth/send-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: trimmedPhone }),
            credentials: "include",
          });
          const sendJson = await sendRes.json().catch(() => ({}));
          if (!sendRes.ok || sendJson?.status !== "ok") {
            setError(sendJson?.message === "too_many_requests" ? t("too_many_requests") : sendJson?.message ?? t("failed_to_send_code"));
            setPendingCheckDocData(null);
            return;
          }
          setStep("otp_check");
          setOtpCode("");
          return;
        }
      }

      const res = await fetch("/api/biometric/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iin: trimmedIin,
          phone: phoneToRequestFormat(trimmedPhone),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.message ?? t("error_requesting_document"));
        return;
      }
      if (json?.backend_session_id) {
        setBackendSessionId(json.backend_session_id);
        setStep("otp_biometric");
        setOtpCode("");
      } else {
        setError(t("no_session_id_in_response"));
      }
    } catch {
      setError(t("network_error"));
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const verifyCheckDocCode = async () => {
    const code = String(otpCode || "").replace(/\D/g, "");
    if (!/^\d{4}$/.test(code) || !pendingCheckDocData) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone, code }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== "ok") {
        setError(json?.message === "invalid_code" ? t("invalid_code") : json?.message ?? t("failed_to_confirm_code"));
        return;
      }
      setPendingCheckDocData(null);
      onSaved();
      onClose();
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricApprove = async () => {
    if (!backendSessionId || !otpCode.trim()) {
      setError(t("enter_sms_code"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/biometric/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backend_session_id: backendSessionId,
          code: otpCode.trim(),
          file: true,
          file_type: "pdf",
          phone: phoneToRequestFormat(trimmedPhone),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.message ?? t("error_confirming_code"));
        return;
      }
      if (json?.data) {
        const parsed = parseBiometricResponse(json.data);
        parsed.phone = trimmedPhone;
        setBackendSessionId(null);
        onSaved();
        onClose();
      } else {
        setError(t("no_data_in_response"));
      }
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  // Уже есть данные и не нажали «Обновить»: показываем кнопки
  if (docData && !showBiometricForm) {
    return (
      <div className="flex flex-col items-start gap-[16px] self-stretch">
        <p className="text-[#000] text-[14px] not-italic font-normal leading-[20px] opacity-60">
          {t("document_data_filled")}
        </p>
        <div className="flex items-start gap-[16px] self-stretch">
          <Button className="flex-1 rounded-[12px] bg-[#FFF] border border-[#2655AF]" onPress={onClose}>
            <span className="text-[#000]">{t("cancel")}</span>
          </Button>
          <Button
            className="flex-1 rounded-[12px] bg-[#1A3C7E]"
            onPress={() => {
              setShowBiometricForm(true);
              setStep("form");
              setPendingCheckDocData(null);
              setBackendSessionId(null);
              setError(null);
              setPhone(userPhone || "");
            }}
          >
            <span className="text-[#fff] text-wrap">{t("update_by_biometric")}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Шаг: ввод кода после check-doc
  if (step === "otp_check") {
    return (
      <div className="flex flex-col gap-[24px] self-stretch">
        <p className="text-[#122C5E] text-[16px] opacity-60">
          {t("enter_sms_code")} <br /> {trimmedPhone}
        </p>
        <div className="flex flex-col gap-[8px]">
          <span className="text-[#1E1E1E] text-[14px] opacity-20">{t("confirmation_code")}</span>
          <OtpInputs length={4} value={otpCode} onChange={setOtpCode} isDisabled={loading} />
        </div>
        {error && <p className="text-red-600 text-[14px]">{error}</p>}
        <div className="flex gap-3">
          <Button className="flex-1 rounded-[16px] border border-[#2655AF] bg-transparent" onPress={() => { setStep("form"); setError(null); }}>
            <span className="text-[#2655AF]">{t("back")}</span>
          </Button>
          <Button className="flex-1 rounded-[16px] bg-[#1A3C7E]" onPress={verifyCheckDocCode} isLoading={loading}>
            <span className="text-[#FFF]">{t("confirm")}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Шаг: ввод кода после biometric/request
  if (step === "otp_biometric") {
    return (
      <div className="flex flex-col gap-[24px] self-stretch">
        <p className="text-[#122C5E] text-[16px] opacity-60">
          {t("enter_sms_code_biometric", { phone: trimmedPhone })} <br /> {trimmedPhone}
        </p>
        <div className="flex flex-col gap-[8px]">
          <span className="text-[#1E1E1E] text-[14px] opacity-20">{t("confirmation_code")}</span>
          <OtpInputs length={6} value={otpCode} onChange={setOtpCode} isDisabled={loading} />
        </div>
        {error && <p className="text-red-600 text-[14px]">{error}</p>}
        <div className="flex gap-3">
          <Button className="flex-1 rounded-[16px] border border-[#2655AF] bg-transparent" onPress={() => { setStep("form"); setError(null); setBackendSessionId(null); }}>
            <span className="text-[#2655AF]">{t("back")}</span>
          </Button>
          <Button className="flex-1 rounded-[16px] bg-[#1A3C7E]" onPress={handleBiometricApprove} isLoading={loading}>
            <span className="text-[#FFF]">{t("confirm")}</span>
          </Button>
        </div>
      </div>
    );
  }

  // Форма: ИИН + телефон
  return (
    <div className="flex flex-col items-start gap-[16px] self-stretch">
      <div className="flex flex-col gap-[8px] self-stretch">
        <span className="text-[#000] text-[12px] not-italic font-normal leading-[12px]">{t("iin")}</span>
        <Input
          value={iin}
          onValueChange={setIin}
          ref={withMask("999999999999")}
          placeholder={t("enter_iin")}
          classNames={{
            input: "flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] rounded-[12px] bg-[#F4F6FB] text-[#000] text-[16px]",
            inputWrapper: "p-0 bg-white",
          }}
        />
      </div>
      <div className="flex flex-col gap-[8px] self-stretch">
        <span className="text-[#000] text-[12px] not-italic font-normal leading-[12px]">{t("phone")}</span>
        <Input
          value={phone}
          onValueChange={setPhone}
          placeholder="+7 (777) 123-45-67"
          classNames={{
            input: "flex pt-[11px] pr-[12px] pb-[13px] pl-[16px] rounded-[12px] bg-[#F4F6FB] text-[#000] text-[16px]",
            inputWrapper: "p-0 bg-white",
          }}
        />
      </div>
      {error && <p className="text-red-600 text-[14px]">{error}</p>}
      <div className="flex items-start gap-[16px] self-stretch">
        <Button className="flex-1 rounded-[12px] bg-[#FFF] border border-[#2655AF]" onPress={onClose}>
          <span className="text-[#000]">{t("cancel")}</span>
        </Button>
        <Button
          className="flex-1 rounded-[12px] bg-[#1A3C7E]"
          onPress={requestDocData}
          isDisabled={normalizedIin.length !== 12 || !trimmedPhone}
          isLoading={loading}
        >
          <span className="text-[#fff]">{t("get_document_data")}</span>
        </Button>
      </div>
    </div>
  );
}
