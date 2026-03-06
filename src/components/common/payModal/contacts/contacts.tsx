"use client"

import { useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import Link from "next/link";
import { Autocomplete, AutocompleteItem, Checkbox } from "@heroui/react";
import type { RootState } from "@/store";
import { setAgreementFileUrl, setAgreementTemplateType, setAgreementNumber, setDealDocumentId } from "@/store/paySlice";
import { withMask } from "use-mask-input";
import { isValidKzPhoneE164, normalizePhone } from "@/lib/authOtp";
import OtpInputs from "./otpInputs";
import type { AgreementPayload } from "@/types/agreement";
import { useTranslations } from "next-intl";

/** Normalize masked phone to request format: 77756098579 (digits only, 7 prefix) */
function phoneToRequestFormat(phone: string): string {
  return normalizePhone(phone || "").replace(/^\+/, "");
}

const inputClassNames = {
  base: "bg-[#F4F6FB] rounded-[16px] px-[16px] py-[8px]",
  label: "text-[#2655AF] text-[14px] opacity-20 leading-[14px] pb-[8px]",
  input: "!text-[#2655AF] text-[20px] font-medium leading-[24px]",
  inputWrapper:
    "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
  innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
};

const searchIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <g opacity="0.3">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.3334 3.66663C8.89009 3.66663 3.66675 8.88997 3.66675 15.3333C3.66675 21.7766 8.89009 27 15.3334 27C21.7767 27 27.0001 21.7766 27.0001 15.3333C27.0001 8.88997 21.7767 3.66663 15.3334 3.66663ZM1.66675 15.3333C1.66675 7.7854 7.78552 1.66663 15.3334 1.66663C22.8813 1.66663 29.0001 7.7854 29.0001 15.3333C29.0001 18.7473 27.7483 21.8689 25.6786 24.2642L30.0405 28.6262C30.431 29.0167 30.431 29.6499 30.0405 30.0404C29.65 30.4309 29.0168 30.4309 28.6263 30.0404L24.2644 25.6784C21.8691 27.7481 18.7474 29 15.3334 29C7.78552 29 1.66675 22.8812 1.66675 15.3333Z"
        fill="#1C274C"
      />
    </g>
  </svg>
);

type BiometricStep = "form" | "otp" | "success";

interface DocData {
  lastName: string;
  firstName: string;
  middleName: string;
  gender: string;
  dateOfBirth: string;
  docNumber: string;
  docIssuer: string;
  dateOfIssue: string;
  phone: string;
  email: string;
  address: string;
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
  const t = useTranslations();
  const genderRaw = (data?.gender ?? "").toString().toLowerCase();
  const gender =
    genderRaw === "male" ? t("male") : genderRaw === "female" ? t("female") : data?.gender ?? "";

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
    email: "",
    address: "",
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex px-[0] py-[8px] justify-between items-start self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
      <span className="text-[#000] text-[16px] not-italic font-normal leading-[20px]">{label}</span>
      <span className="text-[#000] text-[16px] not-italic font-normal leading-[20px]">
        {value || "—"}
      </span>
    </div>
  );
}

/** Minimal flat data for agreement generation */
export interface ContactsFlatData {
  id?: string | number;
  title?: string;
  section?: string;
  floor?: string;
  room?: string;
  area?: string;
  apartmentNumber?: number;
  complexDueDate?: string;
  projectDocumentId?: string;
  images?: string[];
  totalArea?: number;
  house?: number;
  entrance?: string;
  plan?: string;
  /** Если false — генерировать ПДБ (скачать); иначе ДДУ (онлайн-подпись) */
  hasDdu?: boolean;
}

export default function Contacts({
  flatData,
  agreementPayload,
  dealDocumentId,
  onNext,
}: {
  flatData: ContactsFlatData | null;
  agreementPayload: AgreementPayload | null;
  /** Сделка: после биометрики привязываем клиента к сделке */
  dealDocumentId?: string | null;
  onNext: () => void;
}) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth?.user);
  const isManagerOrAdmin =
    user?.role === "manager" || user?.role === "admin";

  const [step, setStep] = useState<BiometricStep>("form");
  const [iin, setIin] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [docData, setDocData] = useState<DocData | null>(null);

  // Phone verification (для менеджера/админа, когда вводят номер клиента)
  const [phoneVerifyStep, setPhoneVerifyStep] = useState<"idle" | "code" | "verified">("idle");
  const [phoneVerifyCode, setPhoneVerifyCode] = useState("");
  const [phoneVerifyError, setPhoneVerifyError] = useState<string | null>(null);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const sendingPhoneCodeRef = useRef(false);
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);

  /** Manual doc fields: when all required are filled, skip biometric */
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docIssuer, setDocIssuer] = useState("");
  const [dateOfIssue, setDateOfIssue] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<{ value: string }[]>([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const addressSuggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pendingCheckDocData, setPendingCheckDocData] = useState<DocData | null>(null);
  const requestDocDataInFlightRef = useRef(false);

  const fetchAddressSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setAddressSuggestions([]);
      return;
    }
    setAddressSuggestionsLoading(true);
    try {
      const res = await fetch("/api/dadata/suggest-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setAddressSuggestions(list.map((s: { value: string }) => ({ value: s.value })));
    } catch {
      setAddressSuggestions([]);
    } finally {
      setAddressSuggestionsLoading(false);
    }
  }, []);

  const onAddressInputChange = useCallback(
    (value: string) => {
      setContactAddress(value);
      if (addressSuggestDebounceRef.current) clearTimeout(addressSuggestDebounceRef.current);
      addressSuggestDebounceRef.current = setTimeout(() => {
        addressSuggestDebounceRef.current = null;
        fetchAddressSuggestions(value);
      }, 300);
    },
    [fetchAddressSuggestions]
  );

  const effectivePhone = isManagerOrAdmin ? phone : (user?.phone ?? "");

  const trimmedIin = iin.trim();
  const trimmedPhone = (isManagerOrAdmin ? phone : user?.phone ?? "").trim();
  const normalizedIin = trimmedIin.replace(/\D/g, "");
  const hasValidPhoneAndIin = !!trimmedPhone && normalizedIin.length === 12;
  const hasAllRequiredDocFields =
    !!trimmedIin &&
    !!trimmedPhone &&
    !!lastName.trim() &&
    !!firstName.trim() &&
    !!middleName.trim() &&
    !!gender.trim() &&
    !!dateOfBirth.trim() &&
    !!docNumber.trim() &&
    !!docIssuer.trim() &&
    !!dateOfIssue.trim();

  const proceedWithoutBiometric = () => {
    setError(null);
    setDocData({
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      gender: gender.trim(),
      dateOfBirth: dateOfBirth.trim(),
      docNumber: docNumber.trim(),
      docIssuer: docIssuer.trim(),
      dateOfIssue: dateOfIssue.trim(),
      phone: effectivePhone,
      email: contactEmail.trim(),
      address: contactAddress.trim(),
    });
    setStep("success");
  };

  const requestDocData = async (trimmedIin: string, trimmedPhone: string) => {
    if (requestDocDataInFlightRef.current) return;
    requestDocDataInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
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
          email: d.email ?? "",
          address: d.address ?? "",
        };
        setPendingCheckDocData(data);
        setContactEmail(d.email ?? "");
        setContactAddress(d.address ?? "");

        const sendRes = await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: trimmedPhone }),
          credentials: "include",
        });
        const sendJson = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok || sendJson?.status !== "ok") {
          setError(
            sendJson?.message === "too_many_requests"
              ? t("too_many_requests")
              : sendJson?.message ?? t("error_sending_code")
          );
          setPendingCheckDocData(null);
          return;
        }
        setPhoneVerifyStep("code");
        setPhoneVerifyCode("");
        return;
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
        setStep("otp");
        setOtpCode("");
      } else {
        setError(t("no_session_id_in_response"));
      }
    } catch {
      setError(t("network_error"));
    } finally {
      requestDocDataInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    setError(null);
    setPhoneVerifyError(null);
    if (!trimmedIin) {
      setError(t("enter_iin"));
      return;
    }
    if (normalizedIin.length !== 12) {
      setError(t("iin_should_contain_12_digits"));
      return;
    }
    if (!trimmedPhone) {
      setError(isManagerOrAdmin ? t("enter_phone") : t("phone_not_found_in_profile"));
      return;
    }

    if (isManagerOrAdmin) {
      const normalized = normalizePhone(trimmedPhone);
      if (!isValidKzPhoneE164(normalized)) {
        setError(t("wrong_phone"));
        return;
      }
    }

    await requestDocData(trimmedIin, trimmedPhone);
  };

  const sendPhoneVerificationCode = async () => {
    if (sendingPhoneCodeRef.current || sendingPhoneCode || !isManagerOrAdmin) return;
    sendingPhoneCodeRef.current = true;
    setPhoneVerifyError(null);
    const raw = phone.trim();
    const normalized = normalizePhone(raw);
    if (!isValidKzPhoneE164(normalized)) {
      setPhoneVerifyError(t("wrong_phone"));
      sendingPhoneCodeRef.current = false;
      return;
    }
    setSendingPhoneCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== "ok") {
        setPhoneVerifyError(
          json?.message === "too_many_requests"
            ? t("too_many_requests")
            : json?.message === "invalid_phone"
              ? t("wrong_phone")
              : json?.message ?? t("error_sending_code")
        );
        return;
      }
      setPhoneVerifyStep("code");
      setPhoneVerifyCode("");
      setVerifiedPhoneE164(null);
    } catch {
      setPhoneVerifyError("Ошибка сети");
    } finally {
      sendingPhoneCodeRef.current = false;
      setSendingPhoneCode(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (verifyingPhoneCode || !isManagerOrAdmin || !pendingCheckDocData) return;
    setPhoneVerifyError(null);
    const raw = phone.trim();
    const normalized = normalizePhone(raw);
    if (!isValidKzPhoneE164(normalized)) {
      setPhoneVerifyError("Неверный номер телефона");
      return;
    }
    const code = String(phoneVerifyCode || "").replace(/\D/g, "");
    if (!/^\d{4}$/.test(code)) {
      setPhoneVerifyError("Введите 4‑значный код");
      return;
    }
    setVerifyingPhoneCode(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: raw, code }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.status !== "ok") {
        setPhoneVerifyError(
          json?.message === "invalid_code"
            ? "Неверный код"
            : json?.message === "code_expired_or_not_found"
              ? "Код истёк. Запросите новый."
              : json?.message === "too_many_attempts"
                ? "Слишком много попыток. Попробуйте позже."
                : json?.message ?? "Не удалось подтвердить номер"
        );
        return;
      }
      setDocData(pendingCheckDocData);
      setPendingCheckDocData(null);
      setPhoneVerifyStep("idle");
      setPhoneVerifyCode("");
      setStep("success");
    } catch {
      setPhoneVerifyError("Ошибка сети");
    } finally {
      setVerifyingPhoneCode(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    if (!backendSessionId || !otpCode.trim()) {
      setError(t("enter_sms_code"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/biometric/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backend_session_id: backendSessionId,
          code: otpCode.trim(),
          file: true,
          file_type: "pdf",
          phone: phoneToRequestFormat(effectivePhone),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.message ?? t("error_confirming_code"));
        return;
      }
      if (json?.data) {
        const parsed = parseBiometricResponse(json.data);
        parsed.phone = effectivePhone;
        setDocData(parsed);
        setContactEmail(parsed.email || "");
        setContactAddress(parsed.address || "");
        setStep("success");
      } else {
        setError(t("no_data_in_response"));
      }
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromSuccess = async () => {
    setError(null);
    const email = contactEmail.trim();
    const address = contactAddress.trim();
    if (!email) {
      setError(t("enter_email"));
      return;
    }
    if (!address) {
      setError(t("enter_address"));
      return;
    }
    setLoading(true);
    try {
      let effectiveDealId: string | undefined = dealDocumentId ?? undefined;
      // Записываем данные клиента и привязываем к сделке только после биометрики и ввода почты/адреса
      if (dealDocumentId && docData) {
        const attachRes = await fetch(`/api/deals/${dealDocumentId}/attach-customer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneToRequestFormat(effectivePhone),
            email,
            address,
            lastName: docData.lastName,
            firstName: docData.firstName,
            middleName: docData.middleName,
            gender: docData.gender,
            dateOfBirth: docData.dateOfBirth,
            docNumber: docData.docNumber,
            docIssuer: docData.docIssuer,
            dateOfIssue: docData.dateOfIssue,
          }),
          credentials: "include",
        });
        const attachJson = await attachRes.json().catch(() => ({}));
        if (!attachRes.ok) {
          setError(attachJson?.error ?? t("failed_to_attach_customer_to_deal"));
          setLoading(false);
          return;
        }
        if (attachJson.useExistingDeal && attachJson.dealDocumentId) {
          dispatch(setDealDocumentId(attachJson.dealDocumentId));
          effectiveDealId = attachJson.dealDocumentId;
        }
      }
      // Генерация договора: нужны agreementPayload и (projectDocumentId в flatData или dealDocumentId — бэкенд возьмёт проект из сделки)
      if (agreementPayload && (flatData?.projectDocumentId || effectiveDealId)) {
        const genRes = await fetch("/api/signed-agreements/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flatData: flatData ?? undefined,
            agreementPayload,
            templateType: flatData?.hasDdu !== false ? "ddu" : "pdb",
            dealDocumentId: effectiveDealId,
          }),
          credentials: "include",
        });
        const genJson = await genRes.json().catch(() => ({}));
        if (!genRes.ok) {
          const errMsg = genJson?.detail ?? genJson?.message ?? genJson?.error ?? t("error_generating_agreement");
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
      }
      onNext();
    } catch {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-[32px]">
        <p className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
          {t("enter_sms_code_description", { phone: effectivePhone })}
        </p>

        <div className="flex flex-col gap-[8px]">
          <span className="text-[#1E1E1E] text-[14px] opacity-20 leading-[14px]">
            {t("confirmation_code")}
          </span>

          <OtpInputs
            length={6}
            value={otpCode}
            onChange={setOtpCode}
            isDisabled={loading}
          />
        </div>

        {error && <p className="text-red-600 text-[14px]">{error}</p>}

        <div className="flex gap-3">
          <Button
            onPress={() => {
              setStep("form");
              setError(null);
            }}
            className="flex-1 rounded-[16px] border border-[#2655AF] bg-transparent"
          >
            <span className="text-[#2655AF]">{t("back")}</span>
          </Button>

          <Button
            onPress={handleApprove}
            isLoading={loading}
            className="flex-1 h-[52px] min-h-[52px] rounded-[16px] bg-[#1A3C7E]"
          >
            <span className="text-[#FFF] text-[15px] font-medium">{t("confirm")}</span>
          </Button>
        </div>
      </div>
    );
  }

  if (isManagerOrAdmin && phoneVerifyStep === "code" && pendingCheckDocData) {
    return (
      <div className="flex flex-col gap-[32px]">
        <p className="text-[#122C5E] text-[16px] not-italic font-normal leading-[16px] opacity-60">
          {t("enter_whatsapp_code_description", { phone: phone.trim() || effectivePhone })}
        </p>

        <div className="flex flex-col gap-[8px]">
          <span className="text-[#1E1E1E] text-[14px] opacity-20 leading-[14px]">
            {t("confirmation_code")}
          </span>

          <OtpInputs
            length={4}
            value={phoneVerifyCode}
            onChange={setPhoneVerifyCode}
            isDisabled={loading || verifyingPhoneCode}
          />
        </div>

        {phoneVerifyError && <p className="text-red-600 text-[14px]">{phoneVerifyError}</p>}

        <div className="flex gap-3">
          <Button
            onPress={() => {
              setPhoneVerifyStep("idle");
              setPhoneVerifyCode("");
              setPhoneVerifyError(null);
              setPendingCheckDocData(null);
            }}
            className="flex-1 rounded-[16px] border border-[#2655AF] bg-transparent"
          >
            <span className="text-[#2655AF]">{t("back")}</span>
          </Button>

          <Button
            onPress={verifyPhoneCode}
            isLoading={verifyingPhoneCode}
            className="flex-1 h-[52px] min-h-[52px] rounded-[16px] bg-[#1A3C7E]"
          >
            <span className="text-[#FFF] text-[15px] font-medium">{t("confirm")}</span>
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success" && docData) {
    return (
      <div className="flex flex-col gap-[32px]">
        <div className="flex flex-col items-start gap-[24px] self-stretch">
          <div className="flex flex-col items-start gap-[8px] self-stretch">
            <div className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
              <div className="flex flex-col gap-[16px] items-start self-stretch">
                <h1 className="text-[#000] text-[20px] not-italic font-normal leading-[20px]">
                  Данные
                </h1>
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                  <Row label={t("last_name")} value={docData.lastName} />
                  <Row label={t("first_name")} value={docData.firstName} />
                  <Row label={t("middle_name")} value={docData.middleName} />
                  <Row label={t("gender")} value={docData.gender} />
                  <Row label={t("date_of_birth")} value={docData.dateOfBirth} />
                  <Row label={t("doc_number")} value={docData.docNumber} />
                  <Row label={t("doc_issuer")} value={docData.docIssuer} />
                  <Row label={t("date_of_issue")} value={docData.dateOfIssue} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-[8px] self-stretch">
            <div className="flex p-[32px] flex-col items-start gap-[16px] self-stretch rounded-[32px] bg-[#F4F6FB]">
              <div className="flex flex-col gap-[16px] items-start self-stretch">
                <h1 className="text-[#000] text-[20px] not-italic font-normal leading-[20px]">
                  {t("contact_data")}
                </h1>
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                  <Row label={t("phone")} value={docData.phone} />
                  <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                    <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                      {t("email")} <span className="text-red-500">*</span>
                    </span>
                    <Input
                      type="email"
                      placeholder="example@mail.ru"
                      value={contactEmail}
                      onValueChange={setContactEmail}
                      variant="flat"
                      errorMessage={t("invalid_email")}
                      isInvalid={!contactEmail.includes("@") || !contactEmail.includes(".")}
                      className="[&_input::placeholder]:!text-[#2655AF]"
                      classNames={{
                        base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                        label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                        input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                        inputWrapper: "bg-transparent shadow-none p-2 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                        innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                      }}
                      isDisabled={loading}
                      isRequired
                    />
                  </div>
                  <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)]">
                    <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                      {t("address")} <span className="text-red-500">*</span>
                    </span>
                    <Autocomplete
                      placeholder={t("city_street_house_apartment")}
                      inputValue={contactAddress}
                      onInputChange={onAddressInputChange}
                      onSelectionChange={(key) => key != null && setContactAddress(String(key))}
                      items={addressSuggestions}
                      isLoading={addressSuggestionsLoading}
                      allowsCustomValue
                      variant="flat"
                      classNames={{
                        base: "w-full !bg-[#F4F6FB] rounded-[16px]",
                        listboxWrapper: "w-full !bg-[#F4F6FB] rounded-[16px]",
                        listbox: "w-full !bg-[#F4F6FB] rounded-[16px]",
                        popoverContent: "w-full !bg-[#F4F6FB] rounded-[16px]",
                      }}
                      className="
                      [&_input]:!text-[#2655AF]
                      [&_input]:text-[18px]
                      [&_input]:font-medium
                      [&_input::placeholder]:!text-[#2655AF]
                      [&_[data-slot='input-wrapper']]:bg-[#F4F6FB]
                      [&_[data-slot='input-wrapper']]:rounded-[16px]
                      [&_[data-slot='input-wrapper']]:px-[8px]
                      [&_[data-slot='input-wrapper']]:py-[8px]
                      [&_[data-slot='input-wrapper']]:shadow-none
                      "
                      isDisabled={loading}
                      isRequired
                      defaultFilter={() => true}
                      aria-label={t("address")}
                    >
                      {(item: { value: string }) => (
                        <AutocompleteItem key={item.value} textValue={item.value}>
                          {item.value}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-[8px] self-stretch">
            <Checkbox
              isSelected={agreementAccepted}
              onValueChange={setAgreementAccepted}
            >
            </Checkbox>
            <Link
              href="/document/пользовательское соглашение.docx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2655AF] text-[16px] not-italic font-normal leading-[20px]"
            >
              {t("i_agree_with")} <span className="underline">{t("public_offer_and_user_agreement")}</span>
            </Link>
          </div>
        </div>
        <Button
          onPress={handleNextFromSuccess}
          isDisabled={!agreementAccepted}
          isLoading={loading}
          className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">{t("next")}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[32px]">
      <Input
        label={t("enter_iin")}
        value={iin}
        onValueChange={setIin}
        variant="flat"
        inputMode="numeric"
        classNames={inputClassNames}
        endContent={searchIcon}
        isDisabled={loading}
        ref={withMask("999999999999")}
      />
      {isManagerOrAdmin && (
        <div className="flex flex-col">
          <Input
            label={t("enter_phone")}
            value={phone}
            onValueChange={(v) => {
              setPhone(v);
              setPhoneVerifyStep("idle");
              setPendingCheckDocData(null);
              setPhoneVerifyCode("");
              setPhoneVerifyError(null);
            }}
            variant="flat"
            inputMode="numeric"
            classNames={inputClassNames}
            endContent={searchIcon}
            isDisabled={loading}
            ref={withMask("+7 (999) 999-99-99")}
          />
          {error && <p className="text-red-600 text-[14px]">{error}</p>}
        </div>
      )}
      {!isManagerOrAdmin && user?.phone && (
        <p className="text-[#1E1E1E] text-[14px] opacity-80">
          {t("confirmation_code_will_be_sent_to_number")} {user.phone} {t("in_whatsapp")}
        </p>
      )}
      {!isManagerOrAdmin && error && <p className="text-red-600 text-[14px]">{error}</p>}
      {!isManagerOrAdmin && hasAllRequiredDocFields ? (
        <div className="flex flex-col">
          <Button
            onPress={proceedWithoutBiometric}
            isDisabled={loading}
            className="flex justify-start rounded-[16px] border border-[#2655AF] bg-transparent p-0"
          >
            <span className="text-[#2655AF]">{t("next")}</span>
          </Button>
        </div>
      ) : (
        <Button
          onPress={handleRequest}
          isLoading={loading}
          className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
        >
          <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
            {t("get_document_data")}
          </span>
        </Button>
      )}
    </div>
  );
}