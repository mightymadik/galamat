import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import { useTranslations } from "next-intl";

/** Countdown seconds before auto "with client" when waiting for next. */
export const WAITING_TIMER_SEC = 5;

/** Cookie name for storing current ticket state on manager side. */
export const CURRENT_TICKET_COOKIE = "queue_current_ticket";

/** Map backend manager status to UI status used in queue profile. */
export function backendStatusToUi(backend: string): QueueProfileStatus {
  const map: Record<string, QueueProfileStatus> = {
    AVAILABLE: "available",
    OFFLINE: "unavailable",
    BREAK: "break",
    LUNCH: "lunch",
  };
  return map[backend] ?? "unavailable";
}

export const getStatusLabels = (t: ReturnType<typeof useTranslations>) => ({
  available: t("queue_status_available"),
  break: t("queue_status_break"),
  lunch: t("queue_status_lunch"),
  unavailable: t("queue_status_unavailable"),
});

export const getStatusChipConfig = (t: ReturnType<typeof useTranslations>) => ({
  available: {
    base: "rounded-[16px] bg-[rgba(38,175,43,0.12)]",
    content:
      "text-[#007D04] text-center text-[12px] font-medium leading-[17.359px]",
    label: t("queue_chip_online"),
  },
  break: {
    base: "rounded-[16px] bg-[rgba(129,68,219,0.40)]",
    content:
      "text-[#8144DB] text-center text-[12px] font-medium leading-[17.359px]",
    label: t("queue_chip_break"),
  },
  lunch: {
    base: "rounded-[16px] bg-[rgba(245,160,18,0.12)]",
    content:
      "text-[#F5A012] text-center text-[12px] font-medium leading-[17.359px]",
    label: t("queue_chip_lunch"),
  },
  unavailable: {
    base: "rounded-[16px] bg-[rgba(219,29,49,0.12)]",
    content:
      "text-[#DB1D31] text-center text-[12px] font-medium leading-[17.359px]",
    label: t("queue_chip_unavailable"),
  },
});

/** Shared select styles for queue profile selects. */
export const SELECT_CLASSES_QUEUE_STATUS = {
  base: "w-full",
  label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
};

export const SELECT_CLASSES_QUEUE_SIDEBAR = {
  base: "w-full bg-[#F4F6FB]",
  label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
};

export const SELECT_CLASSES_DESK_MODAL = {
  base: "w-full bg-[#F4F6FB]",
  label: "text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]",
  trigger: "text-[#1A3C7E] text-[16px] not-italic font-medium leading-[normal]",
  listbox: "text-[#1A3C7E] text-[14px] not-italic font-normal leading-[normal]",
};

