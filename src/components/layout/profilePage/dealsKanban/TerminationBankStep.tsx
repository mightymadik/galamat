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
      <Input
        label="ИИК"
        placeholder="KZXXXXXXXXXXXXXXXXXX"
        value={customerIIK}
        onValueChange={setCustomerIIK}
        variant="flat"
        maxLength={20}
        classNames={{
          base: "w-full bg-[#F4F6FB] rounded-[16px] px-2 py-0",
          label: "text-[#2655AF] text-sm opacity-80",
          input: "text-[#2655AF] text-xl font-medium",
          inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
        }}
      />
      <Input
        label="БИК"
        placeholder="KZKOKZKX"
        value={customerBIK}
        onValueChange={setCustomerBIK}
        variant="flat"
        classNames={{
          base: "w-full bg-[#F4F6FB] rounded-[16px] px-2 py-0",
          label: "text-[#2655AF] text-sm opacity-80",
          input: "text-[#2655AF] text-xl font-medium",
          inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
        }}
      />
      <Input
        label="Банк"
        placeholder="АО «Банк»"
        value={customerBank}
        onValueChange={setCustomerBank}
        variant="flat"
        classNames={{
          base: "w-full bg-[#F4F6FB] rounded-[16px] px-2 py-0",
          label: "text-[#2655AF] text-sm opacity-80",
          input: "text-[#2655AF] text-xl font-medium",
          inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
        }}
      />
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
