"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import Link from "next/link";
import { Autocomplete, AutocompleteItem, Checkbox } from "@heroui/react";
import type { RootState } from "@/store";
import {
  setDealDocumentId,
  setAgreementFileUrl,
  setAgreementTemplateType,
  setAgreementNumber,
  setAgreementFiles,
  setSigningRequired,
} from "@/store/paySlice";
import { withMask } from "use-mask-input";
import { isValidKzPhoneE164, normalizePhone } from "@/lib/authOtp";
import OtpInputs from "./otpInputs";
import type { AgreementPayload } from "@/types/agreement";
import { useTranslations } from "next-intl";
import { mapSendCodeErrorMessage } from "@/lib/authErrorI18n";
import {
  computeSigningRequiredFromGenerateResponse,
  filterAgreementFilesForCheckout,
} from "@/lib/paymentFormUtils";

/** Normalize masked phone to request format: 77756098579 (digits only, 7 prefix) */
function phoneToRequestFormat(phone: string): string {
  return normalizePhone(phone || "").replace(/^\+/, "");
}

function normalizeCyrillicNameInput(raw: string): string {
  const cleaned = String(raw || "")
    .replace(/[^\p{Script=Cyrillic} -]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trimStart();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
        .join("-")
    )
    .join(" ");
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

interface BankOption {
  id: string | number;
  name: string;
  bik?: string;
  iik?: string;
}

type ManualFieldErrors = Partial<
  Record<
    | "lastName"
    | "firstName"
    | "middleName"
    | "gender"
    | "dateOfBirth"
    | "docNumber"
    | "docIssuer"
    | "dateOfIssue",
    string
  >
>;

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
    genderRaw === "male" ? "male" : genderRaw === "female" ? "female" : (data?.gender ?? "");

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
  const baseContractType = useSelector((s: RootState) => s.pay?.baseContractType ?? "ДДУ");
  const isManagerOrAdmin =
    user?.role === "manager" || user?.role === "admin" || user?.role === "rop";

  const [step, setStep] = useState<BiometricStep>("form");
  const [iin, setIin] = useState("");
  const [phone, setPhone] = useState("");
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
  const [manualMode, setManualMode] = useState(false);
  const [manualFieldErrors, setManualFieldErrors] = useState<ManualFieldErrors>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBik, setBankBik] = useState("");
  const [bankIik, setBankIik] = useState("");
  const [selectedBankKey, setSelectedBankKey] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{ value: string }[]>([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const addressSuggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pendingCheckDocData, setPendingCheckDocData] = useState<DocData | null>(null);
  const requestDocDataInFlightRef = useRef(false);

  useEffect(() => {
    // Менеджер/админ вводит номер клиента — не подставляем номер из профиля менеджера.
    if (isManagerOrAdmin) {
      setPhone("");
      return;
    }
    setPhone(user?.phone ?? "");
  }, [isManagerOrAdmin, user?.phone]);

  useEffect(() => {
    let active = true;
    const loadBanks = async () => {
      setBanksLoading(true);
      try {
        const res = await fetch("/api/banks", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        const list = Array.isArray(json?.data) ? json.data : [];
        setBanks(list);
      } catch {
        if (active) setBanks([]);
      } finally {
        if (active) setBanksLoading(false);
      }
    };
    loadBanks();
    return () => {
      active = false;
    };
  }, []);

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
          setError(mapSendCodeErrorMessage(sendJson?.message, t));
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
        const rawMsg = String(json?.message ?? "");
        const isBiometricUnavailable =
          res.status === 503 ||
          rawMsg === "biometric_service_unavailable" ||
          rawMsg.toLowerCase().includes("e-document service is not available");

        if (isBiometricUnavailable) {
          setManualMode(true);
          setError(t("biometric_service_unavailable"));
        } else {
          setError(json?.message ?? t("error_requesting_document"));
        }
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
        body: JSON.stringify({ phone: raw, code, confirmOnly: true }),
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
        credentials: "include",
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
        const msg = json?.message;
        const translated =
          msg === "biometric_service_timeout"
            ? t("biometric_service_timeout")
            : msg === "biometric_service_unavailable"
              ? t("biometric_service_unavailable")
              : msg ?? t("error_confirming_code");
        setError(translated);
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
    setManualFieldErrors({});
    const currentDocData: DocData | null = manualMode
      ? {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        gender: gender.trim(),
        dateOfBirth: dateOfBirth.trim(),
        docNumber: docNumber.trim(),
        docIssuer: (docIssuer.trim() || "МВД РК"),
        dateOfIssue: dateOfIssue.trim(),
        phone: effectivePhone,
        email: contactEmail.trim(),
        address: contactAddress.trim(),
      }
      : docData;

    if (!currentDocData) {
      setError(t("no_data_in_response"));
      return;
    }
    if (
      !currentDocData.lastName ||
      !currentDocData.firstName ||
      !currentDocData.gender ||
      !currentDocData.dateOfBirth ||
      !currentDocData.docNumber ||
      !currentDocData.docIssuer ||
      !currentDocData.dateOfIssue
    ) {
      const required = t("required_field");
      setManualFieldErrors({
        lastName: currentDocData.lastName ? undefined : required,
        firstName: currentDocData.firstName ? undefined : required,
        middleName: undefined,
        gender: currentDocData.gender ? undefined : required,
        dateOfBirth: currentDocData.dateOfBirth ? undefined : required,
        docNumber: currentDocData.docNumber ? undefined : required,
        docIssuer: currentDocData.docIssuer ? undefined : required,
        dateOfIssue: currentDocData.dateOfIssue ? undefined : required,
      });
      setError(t("fill_required_fields"));
      return;
    }

    if (manualMode) {
      setDocData(currentDocData);
    }

    const email = contactEmail.trim();
    const address = contactAddress.trim();
    const bik = bankBik.trim().toUpperCase();
    const iik = bankIik.trim().toUpperCase();
    const bank = bankName.trim();
    const bankDocumentId =
      selectedBankKey && !String(selectedBankKey).startsWith("fallback-")
        ? String(selectedBankKey)
        : null;
    if (!email) {
      setError(t("enter_email"));
      return;
    }
    if (!address) {
      setError(t("enter_address"));
      return;
    }
    if (!bank) {
      setError("Выберите банк");
      return;
    }
    if (!bik) {
      setError("Введите БИК");
      return;
    }
    if (!iik) {
      setError("Введите ИИК");
      return;
    }
    setLoading(true);
    try {
      let effectiveDealId: string | undefined = dealDocumentId ?? undefined;
      // Записываем данные клиента и привязываем к сделке только после биометрики и ввода почты/адреса
      if (dealDocumentId && currentDocData) {
        const genderForApi =
          currentDocData.gender === "male" ? "Мужской" : currentDocData.gender === "female" ? "Женский" : currentDocData.gender || undefined;
        const attachRes = await fetch(`/api/deals/${dealDocumentId}/attach-customer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneToRequestFormat(effectivePhone),
            iin: normalizedIin,
            email,
            address,
            bankName: bank,
            bankDocumentId,
            bik,
            iik,
            lastName: currentDocData.lastName,
            firstName: currentDocData.firstName,
            middleName: currentDocData.middleName,
            gender: genderForApi,
            dateOfBirth: currentDocData.dateOfBirth,
            docNumber: currentDocData.docNumber,
            docIssuer: currentDocData.docIssuer,
            dateOfIssue: currentDocData.dateOfIssue,
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
      // Генерация договоров (номер ДДУ вычисляется на бэкенде из flatData)
      const genRes = await fetch("/api/signed-agreements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatData: flatData ?? undefined,
          agreementPayload,
          templateType: baseContractType === "ПДБ" ? "pdb" : "ddu",
          dealDocumentId: effectiveDealId ?? undefined,
        }),
        credentials: "include",
      });
      const genJson = await genRes.json().catch(() => ({}));
      if (!genRes.ok) {
        const rawError =
          genJson?.detail ?? genJson?.message ?? genJson?.error ?? "";
        if (String(rawError).trim() === "flatData_mismatch_with_deal") {
          setError("Не удалось сформировать договор: выбранная квартира не совпадает с объектом сделки. Обновите страницу и повторите попытку.");
        } else {
          setError(rawError || t("error_generating_agreement"));
        }
        setLoading(false);
        return;
      }
      if (genJson?.fileUrl) dispatch(setAgreementFileUrl(genJson.fileUrl));
      if (genJson?.templateType === "pdb" || genJson?.templateType === "ddu") dispatch(setAgreementTemplateType(genJson.templateType));
      if (genJson?.agreementNumber != null) dispatch(setAgreementNumber(genJson.agreementNumber));
      if (Array.isArray(genJson?.files))
        dispatch(setAgreementFiles(filterAgreementFilesForCheckout(genJson.files)));
      dispatch(setSigningRequired(computeSigningRequiredFromGenerateResponse(genJson)));
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
                  {t("queue_tab_data")}
                </h1>
                <div className="flex flex-col items-start gap-[8px] self-stretch">
                  {manualMode ? (
                    <>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("last_name")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="text"
                          placeholder="Фамилия"
                          value={lastName}
                          onValueChange={(v) => {
                            setLastName(normalizeCyrillicNameInput(v));
                            setManualFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                          }}
                          variant="flat"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          isDisabled={loading}
                          isRequired
                          isInvalid={!!manualFieldErrors.lastName}
                          errorMessage={manualFieldErrors.lastName}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("first_name")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="text"
                          placeholder="Имя"
                          value={firstName}
                          onValueChange={(v) => {
                            setFirstName(normalizeCyrillicNameInput(v));
                            setManualFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                          }}
                          variant="flat"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          isDisabled={loading}
                          isRequired
                          isInvalid={!!manualFieldErrors.firstName}
                          errorMessage={manualFieldErrors.firstName}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("middle_name")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="text"
                          placeholder="Отчество"
                          value={middleName}
                          onValueChange={(v) => {
                            setMiddleName(normalizeCyrillicNameInput(v));
                            setManualFieldErrors((prev) => ({ ...prev, middleName: undefined }));
                          }}
                          variant="flat"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          isDisabled={loading}
                          isInvalid={!!manualFieldErrors.middleName}
                          errorMessage={manualFieldErrors.middleName}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("gender")} <span className="text-red-500">*</span>
                        </span>
                        <Autocomplete
                          placeholder={t("gender")}
                          inputValue={gender}
                          onInputChange={(value) => {
                            if (value === "Мужской" || value === "Женский" || value === "") {
                              setGender(value);
                              setManualFieldErrors((prev) => ({ ...prev, gender: undefined }));
                            }
                          }}
                          onSelectionChange={(key) => {
                            if (key != null) {
                              setGender(String(key));
                              setManualFieldErrors((prev) => ({ ...prev, gender: undefined }));
                            }
                          }}
                          items={[{ value: "Мужской" }, { value: "Женский" }]}
                          allowsCustomValue={false}
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
                        [&_[data-slot='input-wrapper']]:px-[0px]
                        [&_[data-slot='input-wrapper']]:py-[0px]
                        [&_[data-slot='input-wrapper']]:shadow-none
                        "
                          isDisabled={loading}
                          defaultFilter={() => true}
                          aria-label={t("gender")}
                        >
                          {(item: { value: string }) => (
                            <AutocompleteItem key={item.value} textValue={item.value}>
                              {item.value}
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                        {manualFieldErrors.gender && (
                          <p className="text-red-500 text-[12px]">{manualFieldErrors.gender}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("date_of_birth")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          value={dateOfBirth}
                          placeholder="ДД.ММ.ГГГГ"
                          onValueChange={(v) => {
                            setDateOfBirth(v);
                            setManualFieldErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                          }}
                          variant="flat"
                          inputMode="numeric"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          ref={withMask("99.99.9999")}
                          isInvalid={!!manualFieldErrors.dateOfBirth}
                          errorMessage={manualFieldErrors.dateOfBirth}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("doc_number")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          value={docNumber}
                          onValueChange={(v) => {
                            setDocNumber(String(v || "").replace(/\D/g, "").slice(0, 9));
                            setManualFieldErrors((prev) => ({ ...prev, docNumber: undefined }));
                          }}
                          placeholder="999999999"
                          variant="flat"
                          inputMode="numeric"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          ref={withMask("999999999")}
                          isInvalid={!!manualFieldErrors.docNumber}
                          errorMessage={manualFieldErrors.docNumber}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("doc_issuer")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          value={"МВД РК"}
                          onValueChange={() => {
                            setDocIssuer("МВД РК");
                            setManualFieldErrors((prev) => ({ ...prev, docIssuer: undefined }));
                          }}
                          variant="flat"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          isReadOnly
                          isInvalid={!!manualFieldErrors.docIssuer}
                          errorMessage={manualFieldErrors.docIssuer}
                        />
                      </div>
                      <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                        <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                          {t("date_of_issue")} <span className="text-red-500">*</span>
                        </span>
                        <Input
                          value={dateOfIssue}
                          placeholder="ДД.ММ.ГГГГ"
                          onValueChange={(v) => {
                            setDateOfIssue(v);
                            setManualFieldErrors((prev) => ({ ...prev, dateOfIssue: undefined }));
                          }}
                          variant="flat"
                          inputMode="numeric"
                          className="[&_input::placeholder]:!text-[#2655AF]"
                          classNames={{
                            base: `w-full bg-[#F4F6FB] rounded-[16px]}`,
                            label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                            input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                            inputWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                            innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                          }}
                          ref={withMask("99.99.9999")}
                          isInvalid={!!manualFieldErrors.dateOfIssue}
                          errorMessage={manualFieldErrors.dateOfIssue}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Row label={t("last_name")} value={docData.lastName} />
                      <Row label={t("first_name")} value={docData.firstName} />
                      <Row label={t("middle_name")} value={docData.middleName} />
                      <Row
                        label={t("gender")}
                        value={
                          docData.gender === "male"
                            ? t("male")
                            : docData.gender === "female"
                              ? t("female")
                              : docData.gender
                        }
                      />
                      <Row label={t("date_of_birth")} value={docData.dateOfBirth} />
                      <Row label={t("doc_number")} value={docData.docNumber} />
                      <Row label={t("doc_issuer")} value={docData.docIssuer} />
                      <Row label={t("date_of_issue")} value={docData.dateOfIssue} />
                    </>
                  )}
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
                  <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                    <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                      Банк <span className="text-red-500">*</span>
                    </span>
                    <Autocomplete
                      placeholder="Выберите банк"
                      selectedKey={selectedBankKey}
                      inputValue={bankName}
                      onInputChange={(value) => {
                        setBankName(value);
                        setSelectedBankKey(null);
                      }}
                      onSelectionChange={(key) => {
                        if (key == null) return;
                        setSelectedBankKey(String(key));
                        const selected = banks.find((item) => String(item.id) === String(key));
                        if (!selected) return;
                        setBankName(selected.name);
                        if (selected.bik) setBankBik(selected.bik.toUpperCase());
                        if (selected.iik) setBankIik(selected.iik.toUpperCase());
                      }}
                      items={banks}
                      isLoading={banksLoading}
                      allowsCustomValue={false}
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
                      aria-label="Банк"
                    >
                      {(item: BankOption) => (
                        <AutocompleteItem key={String(item.id)} textValue={item.name}>
                          {item.name}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>
                  <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                    <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                      БИК <span className="text-red-500">*</span>
                    </span>
                    <Input
                      placeholder="KZKOKZKX"
                      value={bankBik}
                      onValueChange={(v) => setBankBik(String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                      variant="flat"
                      className="[&_input::placeholder]:!text-[#2655AF]"
                      classNames={{
                        base: `w-full bg-[#F4F6FB] rounded-[16px]`,
                        label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                        input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                        inputWrapper: "bg-transparent shadow-none p-2 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                        innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                      }}
                      isDisabled={loading}
                      isRequired
                    />
                  </div>
                  <div className="flex flex-col gap-[8px] self-stretch [border-bottom:1px_solid_rgba(38,_85,_175,_0.16)] pb-[8px]">
                    <span className="text-[#000] text-[14px] not-italic font-normal leading-[14px] opacity-80">
                      ИИК <span className="text-red-500">*</span>
                    </span>
                    <Input
                      placeholder="KZ123456789012345678"
                      value={bankIik}
                      onValueChange={(v) => setBankIik(String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
                      variant="flat"
                      className="[&_input::placeholder]:!text-[#2655AF]"
                      classNames={{
                        base: `w-full bg-[#F4F6FB] rounded-[16px]`,
                        label: "!text-[#2655AF] text-[14px] opacity-20 leading-[14px]",
                        input: "!text-[#2655AF] text-[18px] font-medium leading-[24px]",
                        inputWrapper: "bg-transparent shadow-none p-2 hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
                        innerWrapper: "bg-transparent shadow-none p-0 hover:bg-transparent",
                      }}
                      isDisabled={loading}
                      isRequired
                    />
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
          <Button
            className="text-[#2655AF] text-[14px] not-italic font-normal leading-[20px] p-2 bg-transparent justify-end hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent"
            isDisabled={!hasValidPhoneAndIin || loading}
            onPress={() => {
              setError(null);
              setManualMode(true);
              setDocIssuer("МВД РК");
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
            }}
          >
            {t("manual_data_entry")}
          </Button>
        </div>
      )}
      {!isManagerOrAdmin && user?.phone && (
        <p className="text-[#1E1E1E] text-[14px] opacity-80">
          {t("confirmation_code_will_be_sent_to_number")} {user.phone} {t("in_whatsapp")}
        </p>
      )}
      {error && <p className="text-red-600 text-[14px]">{error}</p>}

      <Button
        onPress={handleRequest}
        isLoading={loading}
        className="flex h-[52px] min-w-[52px] min-h-[52px] pl-[15px] pr-[15px] py-[15px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
      >
        <span className="text-[#FFF] text-[15px] not-italic font-medium leading-[20px]">
          {t("get_document_data")}
        </span>
      </Button>
    </div>
  );
}