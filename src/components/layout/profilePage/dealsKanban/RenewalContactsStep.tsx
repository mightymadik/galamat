"use client";

import React, { useState, useRef } from "react";
import { Button, Input } from "@heroui/react";
import { withMask } from "use-mask-input";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { normalizePhone, isValidKzPhoneE164 } from "@/lib/authOtp";
import OtpInputs from "@/components/common/payModal/contacts/otpInputs";

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

/** Телефон в формате +77756098579 для запросов */
function phoneWithPlus(phone: string): string {
  const n = normalizePhone(phone || "");
  return n.startsWith("+") ? n : `+${n}`;
}

function phoneToRequestFormat(phone: string): string {
  return normalizePhone(phone || "").replace(/^\+/, "");
}

/** ИИН: если первая цифра 0 — запрашиваем без ведущего нуля (11 цифр) */
function iinForRequest(iin12: string): string {
  const s = (iin12 || "").replace(/\D/g, "");
  if (s.length !== 12) return s;
  return s.startsWith("0") ? s.slice(1) : s;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex px-0 py-2 justify-between items-start self-stretch border-b border-[rgba(38,85,175,0.16)]">
      <span className="text-[#000] text-[16px] font-normal leading-5">{label}</span>
      <span className="text-[#000] text-[16px] font-normal leading-5">{value || "—"}</span>
    </div>
  );
}

export interface RenewalCustomerOption {
  documentId: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
  iin: string;
}

type Step = "form" | "otp" | "success";

export function RenewalContactsStep({
  onNext,
}: {
  onNext: (payload: { newCustomerDocumentId: string }) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [iin, setIin] = useState("");
  const [phone, setPhone] = useState("");
  const [customers, setCustomers] = useState<RenewalCustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<RenewalCustomerOption | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [docData, setDocData] = useState<{
    lastName: string;
    firstName: string;
    middleName: string;
    phone: string;
    email: string;
    address: string;
  } | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<{ value: string }[]>([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const addressSuggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedIin = iin.trim();
  const normalizedIin = trimmedIin.replace(/\D/g, "");
  const hasValidIin = normalizedIin.length === 12;
  const phoneNorm = normalizePhone(phone.trim());

  const goNextWithSelected = () => {
    if (selectedCustomer?.documentId) {
      onNext({ newCustomerDocumentId: selectedCustomer.documentId });
    }
  };

  /** Сначала проверяем в системе по ИИН (без ведущего 0). Если нет — запрос в биометрику с ИИН из 12 цифр (с 0). */
  const handleContinue = async () => {
    if (requestInFlightRef.current || !hasValidIin || !phone.trim()) return;
    if (!isValidKzPhoneE164(phoneNorm)) {
      setError("Неверный номер телефона");
      return;
    }
    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    setCustomers([]);
    setSelectedCustomer(null);
    try {
      const iinForSearch = iinForRequest(normalizedIin);
      const checkRes = await fetch(`/api/manager/customers?iin=${encodeURIComponent(iinForSearch)}`, { credentials: "include" });
      const checkJson = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok) {
        setError(checkJson?.error ?? "Ошибка проверки");
        return;
      }
      const list = checkJson?.customers ?? [];
      if (list.length > 0) {
        setCustomers(list);
        if (list.length === 1) setSelectedCustomer(list[0]);
        setLoading(false);
        requestInFlightRef.current = false;
        return;
      }
      const res = await fetch("/api/biometric/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iin: normalizedIin.padStart(12, "0"),
          phone: phoneToRequestFormat(phone.trim()),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.message ?? "Ошибка запроса в биометрику");
        return;
      }
      if (json?.backend_session_id) {
        setBackendSessionId(json.backend_session_id);
        setStep("otp");
        setOtpCode("");
      } else {
        setError("Нет идентификатора сессии");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!backendSessionId || !otpCode.trim()) {
      setError("Введите код из СМС");
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
          file: false,
          phone: phoneToRequestFormat(phone.trim()),
        }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.message ?? "Ошибка подтверждения");
        return;
      }
      const data = json?.data;
      const common = data?.result_json?.common ?? {};
      const owner = common?.docOwner ?? {};
      const extra = data?.extra ?? {};
      setDocData({
        lastName: owner?.lastName ?? "",
        firstName: owner?.firstName ?? "",
        middleName: owner?.middleName ?? "",
        phone: phone.trim(),
        email: data?.email ?? "",
        address: data?.address ?? "",
      });
      setContactEmail(data?.email ?? "");
      setContactAddress(data?.address ?? "");
      setStep("success");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const saveCustomerAndNext = async () => {
    const email = contactEmail.trim();
    const address = contactAddress.trim();
    if (!email) {
      setError("Требуется эл. почта");
      return;
    }
    if (!address) {
      setError("Требуется адрес проживания");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manager/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: phoneToRequestFormat(phone.trim()),
          email,
          address,
          surname: docData?.lastName,
          name: docData?.firstName,
          middlename: docData?.middleName,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Не удалось сохранить клиента");
        return;
      }
      const documentId = json?.documentId;
      if (documentId) {
        onNext({ newCustomerDocumentId: documentId });
      } else {
        setError("Нет documentId в ответе");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-8">
        <p className="text-[#122C5E] text-base font-normal leading-4 opacity-60">
          Введите код из СМС, отправленный на номер <br /> {phone || "—"}
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-[#1E1E1E] text-sm opacity-20 leading-[14px]">Код подтверждения</span>
          <OtpInputs length={6} value={otpCode} onChange={setOtpCode} isDisabled={loading} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button onPress={() => { setStep("form"); setError(null); }} className="flex-1 rounded-[16px] border border-[#2655AF] bg-transparent">
            <span className="text-[#2655AF]">Назад</span>
          </Button>
          <Button onPress={handleApprove} isLoading={loading} className="flex-1 h-[52px] min-h-[52px] rounded-[16px] bg-[#1A3C7E]">
            <span className="text-white text-[15px] font-medium">Подтвердить</span>
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success" && docData) {
    const fetchAddressSuggestions = async (query: string) => {
      const q = query.trim();
      if (!q) { setAddressSuggestions([]); return; }
      setAddressSuggestionsLoading(true);
      try {
        const r = await fetch("/api/dadata/suggest-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const d = await r.json().catch(() => ({}));
        const list = Array.isArray(d?.suggestions) ? d.suggestions : [];
        setAddressSuggestions(list.map((s: { value: string }) => ({ value: s.value })));
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressSuggestionsLoading(false);
      }
    };
    const onAddressInputChange = (value: string) => {
      setContactAddress(value);
      if (addressSuggestDebounceRef.current) clearTimeout(addressSuggestDebounceRef.current);
      addressSuggestDebounceRef.current = setTimeout(() => {
        addressSuggestDebounceRef.current = null;
        fetchAddressSuggestions(value);
      }, 300);
    };
    return (
      <div className="flex flex-col gap-8">
        <div className="flex p-8 flex-col gap-4 self-stretch rounded-[32px] bg-[#F4F6FB]">
          <h2 className="text-[#000] text-xl font-normal">Данные</h2>
          <div className="flex flex-col gap-2 self-stretch">
            <Row label="Фамилия" value={docData.lastName} />
            <Row label="Имя" value={docData.firstName} />
            <Row label="Отчество" value={docData.middleName} />
          </div>
        </div>
        <div className="flex p-8 flex-col gap-4 self-stretch rounded-[32px] bg-[#F4F6FB]">
          <h2 className="text-[#000] text-xl font-normal">Контактные данные</h2>
          <div className="flex flex-col gap-2 self-stretch">
            <Row label="Номер телефона" value={docData.phone} />
            <Input
              type="email"
              label="Эл. почта *"
              placeholder="example@mail.ru"
              value={contactEmail}
              onValueChange={setContactEmail}
              variant="flat"
              classNames={{ ...inputClassNames, base: inputClassNames.base + " w-full" }}
              isDisabled={loading}
            />
            <Autocomplete
              placeholder="Адрес проживания *"
              inputValue={contactAddress}
              onInputChange={onAddressInputChange}
              onSelectionChange={(key) => key != null && setContactAddress(String(key))}
              items={addressSuggestions}
              isLoading={addressSuggestionsLoading}
              allowsCustomValue
              variant="flat"
              classNames={{ base: "w-full !bg-[#F4F6FB] rounded-[16px]" }}
              isDisabled={loading}
              defaultFilter={() => true}
            >
              {(item: { value: string }) => <AutocompleteItem key={item.value} textValue={item.value}>{item.value}</AutocompleteItem>}
            </Autocomplete>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button
          onPress={saveCustomerAndNext}
          isLoading={loading}
          className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
        >
          <span className="text-white text-[15px] font-medium">Далее</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Input
        label="Введите ИИН"
        value={iin}
        onValueChange={setIin}
        variant="flat"
        inputMode="numeric"
        classNames={inputClassNames}
        endContent={searchIcon}
        isDisabled={loading}
        ref={withMask("999999999999")}
      />
      <Input
        label="Введите номер телефона"
        value={phone}
        onValueChange={setPhone}
        variant="flat"
        inputMode="numeric"
        classNames={inputClassNames}
        endContent={searchIcon}
        isDisabled={loading}
        ref={withMask("+7 (999) 999-99-99")}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {customers.length > 0 ? (
        <>
          <p className="text-sm text-[#122C5E]">Найден клиент в системе. Выберите и нажмите «Далее».</p>
          <ul className="border rounded-[16px] divide-y divide-[#122C5E]/10 max-h-[200px] overflow-y-auto">
            {customers.map((c) => (
              <li
                key={c.documentId}
                className={`px-4 py-3 cursor-pointer hover:bg-[#F4F6FB] ${selectedCustomer?.documentId === c.documentId ? "bg-[#1A3C7E]/10" : ""}`}
                onClick={() => { setSelectedCustomer(c); setError(null); }}
              >
                <span className="font-medium">{c.surname} {c.name}</span>
                <span className="text-gray-500 text-sm ml-2">{c.phone}</span>
              </li>
            ))}
          </ul>
          {selectedCustomer && (
            <Button
              onPress={goNextWithSelected}
              className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
            >
              <span className="text-white text-[15px] font-medium">Далее</span>
            </Button>
          )}
        </>
      ) : (
        <Button
          onPress={handleContinue}
          isLoading={loading}
          isDisabled={!hasValidIin || !phone.trim()}
          className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
        >
          <span className="text-white text-[15px] font-medium">Продолжить</span>
        </Button>
      )}
    </div>
  );
}
