import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@heroui/input";

function OtpInputs({
  length = 6,
  value,
  onChange,
  isDisabled,
  classNames,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  isDisabled?: boolean;
  classNames?: any;
}) {
  const arr = useMemo(() => value.padEnd(length, "").slice(0, length).split(""), [value, length]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setAt = (i: number, ch: string) => {
    const next = [...arr];
    next[i] = ch;
    onChange(next.join("").trimEnd()); // чтобы "000000" не ломало, но хвостовые пустые не тащим
  };

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, raw: string) => {
    const digits = (raw ?? "").replace(/\D/g, "");

    // если прилетело сразу несколько (мобилки/автозаполнение)
    if (digits.length > 1) {
      const next = [...arr];
      let j = i;
      for (const ch of digits) {
        if (j >= length) break;
        next[j] = ch;
        j++;
      }
      onChange(next.join("").trimEnd());
      focus(Math.min(j, length - 1));
      return;
    }

    const ch = digits.slice(0, 1);
    setAt(i, ch);

    if (ch && i < length - 1) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      if (arr[i]) {
        setAt(i, "");
        return;
      }
      if (i > 0) {
        setAt(i - 1, "");
        focus(i - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && i > 0) focus(i - 1);
    if (e.key === "ArrowRight" && i < length - 1) focus(i + 1);
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;

    e.preventDefault();

    const next = [...arr];
    let j = i;
    for (const ch of text) {
      if (j >= length) break;
      next[j] = ch;
      j++;
    }
    onChange(next.join("").trimEnd());
    focus(Math.min(j, length - 1));
  };

  // ВАЖНО: тут задаём класснеймы “как у твоего примера с code.map”
  const otpClassNames = useMemo(
    () => ({
      input:
        "flex justify-center items-center text-center text-[18px] font-medium text-[#282D3C] bg-[#F4F6FB] rounded-[20px] h-[62px]",
      inputWrapper: "p-0 w-full h-[62px] bg-transparent shadow-none",
      innerWrapper: "bg-transparent shadow-none p-0",
      ...classNames, // если хочешь переопределять
    }),
    [classNames]
  );

  return (
    <div className={`grid grid-cols-${length} grid-flow-col gap-[8px]`}>
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          type="tel"
          inputMode="numeric"
          value={arr[i] ?? ""}
          maxLength={1}
          isDisabled={isDisabled}
          onValueChange={(v) => handleChange(i, v)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          ref={(el) => {
            refs.current[i] = el as unknown as HTMLInputElement | null;
          }}
          classNames={{
            input:
                `flex justify-center items-center text-center text-[18px] font-medium text-[#282D3C] bg-[#F4F6FB] rounded-[20px] h-[62px]`,
            inputWrapper:
                `p-0 w-full h-[62px]`,
        }}
        />
      ))}
    </div>
  );
}

export default OtpInputs;