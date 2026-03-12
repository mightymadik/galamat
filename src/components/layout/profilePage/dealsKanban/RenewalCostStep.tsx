"use client";

import React, { useState } from "react";
import { Button, Input } from "@heroui/react";

/** Форматирует ввод суммы: только цифры → "1 234 567" */
function formatAmountInput(value: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

export function RenewalCostStep({
  onNext,
}: {
  onNext: (payload: { typedSum: number }) => void;
}) {
  const [rawSum, setRawSum] = useState("");
  const [error, setError] = useState<string | null>(null);

  const digits = (rawSum ?? "").replace(/\D/g, "");
  const typedSum = digits ? parseInt(digits, 10) : 0;

  const handleNext = () => {
    if (!typedSum || typedSum <= 0) {
      setError("Введите стоимость договора");
      return;
    }
    setError(null);
    onNext({ typedSum });
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="text-[#122C5E] text-base font-normal leading-5">
        Укажите стоимость договора.
      </p>
      <Input
        placeholder="0"
        value={rawSum}
        onValueChange={(v) => setRawSum(formatAmountInput(v ?? ""))}
        variant="flat"
        classNames={{
          base: "w-full bg-[#F4F6FB] rounded-[16px] p-2",
          label: "!text-[#1A3C7E] text-sm opacity-80",
          input: "!text-[#1A3C7E] text-xl font-medium",
          inputWrapper: "bg-transparent shadow-none hover:bg-transparent data-[hover=true]:bg-transparent data-[focus=true]:bg-transparent data-[disabled=true]:bg-transparent data-[invalid=true]:bg-transparent",
        }}
        endContent={<span className="text-[#1A3C7E] text-base">₸</span>}
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
