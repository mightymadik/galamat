import type { QueueProfileStatus } from "@/store/queueProfileSlice";

/** Countdown seconds before auto "with client" when waiting for next. */
export const WAITING_TIMER_SEC = 500;

export const STATUS_LABELS: Record<QueueProfileStatus, string> = {
  available: "Доступен",
  break: "Перерыв",
  lunch: "Обед",
  unavailable: "Недоступен",
};

export const STATUS_CHIP_CONFIG: Record<
  QueueProfileStatus,
  { base: string; content: string; label: string }
> = {
  available: {
    base: "rounded-[16px] bg-[rgba(38,175,43,0.12)]",
    content:
      "text-[#007D04] text-center text-[12px] not-italic font-medium leading-[17.359px]",
    label: "• Вы онлайн",
  },
  break: {
    base: "rounded-[16px] bg-[rgba(129,68,219,0.40)]",
    content:
      "text-[#8144DB] text-center text-[12px] not-italic font-medium leading-[17.359px]",
    label: "• Перерыв",
  },
  lunch: {
    base: "rounded-[16px] bg-[rgba(245,160,18,0.12)]",
    content:
      "text-[#F5A012] text-center text-[12px] not-italic font-medium leading-[17.359px]",
    label: "• Обед",
  },
  unavailable: {
    base: "rounded-[16px] bg-[rgba(219,29,49,0.12)]",
    content:
      "text-[#DB1D31] text-center text-[12px] not-italic font-medium leading-[17.359px]",
    label: "• Недоступен",
  },
};

/** Options for redirect window select (with-client phase). */
export const REDIRECT_WINDOW_OPTIONS: { key: string; label: string }[] = [
  { key: "otbasy", label: "Отбасы" },
  { key: "cashbox", label: "Касса" },
  { key: "1", label: "Асель" },
  { key: "2", label: "Темирлан" },
];
