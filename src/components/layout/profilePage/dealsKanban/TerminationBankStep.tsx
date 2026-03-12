"use client";

import React, { useState } from "react";
import { Button, Input } from "@heroui/react";

export function TerminationBankStep({
  onNext,
}: {
  onNext: (payload: { customerIIK: string; customerBIK: string; customerBank: string }) => void;
}) {
  const [customerIIK, setCustomerIIK] = useState("");
  const [customerBIK, setCustomerBIK] = useState("");
  const [customerBank, setCustomerBank] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizeBik = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const normalizeIik = (v: string) => {
    const raw = v.toUpperCase()
      .replace(/^KZ\s*/i, "")
      .trim();
    if (!raw) return "";
    return `KZ${raw}`;
  };
  const normalizeBankTyping = (v: string) => {
    const raw = v.replace(/^АО\s*/i, "");
    return `АО ${raw}`;
  };

  const handleNext = () => {
    const iik = (customerIIK ?? "").trim();
    const bik = (customerBIK ?? "").trim();
    const bank = (customerBank ?? "").trim();
    if (!iik) {
      setError("Введите ИИК клиента");
      return;
    }
    if (!bik) {
      setError("Введите БИК банка");
      return;
    }
    if (!bank) {
      setError("Введите название банка");
      return;
    }
    setError(null);
    onNext({ customerIIK: iik, customerBIK: bik, customerBank: bank });
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="text-[#122C5E] text-base font-normal leading-5">
        Укажите банковские реквизиты клиента для возврата средств.
      </p>
      <div className="flex flex-col gap-2 w-full">
        <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70 px-1">ИИК</span>
        <Input
          placeholder="KZXXXXXXXXXXXXXXXXXX"
          value={customerIIK}
          onValueChange={(v) => setCustomerIIK(normalizeIik(v))}
          variant="flat"
          maxLength={20}
          classNames={{
            base: "w-full bg-[#F4F6FB] rounded-[16px] p-2",
            label: "!text-[#1A3C7E] text-sm opacity-80",
            input: "!text-[#1A3C7E] text-xl font-medium",
            inputWrapper: "!text-[#1A3C7E] bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
          }}
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70 px-1">БИК</span>
        <Input
          placeholder="KZKOKZKX"
          value={customerBIK}
          onValueChange={(v) => setCustomerBIK(normalizeBik(v))}
          variant="flat"
          classNames={{
            base: "w-full bg-[#F4F6FB] rounded-[16px] p-2",
            label: "!text-[#1A3C7E] text-sm opacity-80",
            input: "!text-[#1A3C7E] text-xl font-medium",
            inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
          }}
        />
      </div>
      <div className="flex flex-col gap-2 w-full">
        <span className="text-[#122C5E] text-[14px] font-normal leading-[20px] opacity-70 px-1">Банк</span>
        <Input
          placeholder="АО Банк"
          value={customerBank}
          onValueChange={(v) => setCustomerBank(normalizeBankTyping(v))}
          variant="flat"
          inputMode="text"
          classNames={{
            base: "w-full bg-[#F4F6FB] rounded-[16px] p-2",
            label: "!text-[#1A3C7E] text-sm opacity-80",
            input: "!text-[#1A3C7E] text-xl font-medium",
            inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
          }}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button
        onPress={handleNext}
        className="flex h-[52px] min-h-[52px] justify-center items-center self-stretch rounded-[16px] bg-[#1A3C7E]"
      >
        <span className="text-white text-[15px] font-medium">Далее</span>
      </Button>
    </div>
  );
}
