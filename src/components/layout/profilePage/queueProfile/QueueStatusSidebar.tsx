"use client";

import { Button, Chip, Select, SelectItem } from "@heroui/react";
import type { DeskItem } from "@/store/queueProfileSlice";
import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import {
  getStatusChipConfig,
  getStatusLabels,
  SELECT_CLASSES_QUEUE_STATUS,
} from "./constants";
import { useTranslations } from "next-intl";
import type { QueueStatusSidebarProps } from "./types";

export default function QueueStatusSidebar({
  status,
  selectedDesk,
  desks,
  onStatusChange,
  onOpenDeskModal,
  canSelectUnavailable = true,
}: QueueStatusSidebarProps) {
  const t = useTranslations();
  const STATUS_LABELS = getStatusLabels(t);
  const STATUS_CHIP_CONFIG = getStatusChipConfig(t);

  const config = STATUS_CHIP_CONFIG[status];
  const deskLabel =
    desks.find((d) => d.key === selectedDesk)?.label ?? (selectedDesk || "—");
  /** Пока смена не начата (недоступен), перерыв/обед недоступны — сначала «Доступен». */
  const managerOfflineLocksBreakLunch = !canSelectUnavailable && status === "unavailable";
  const selectSelectedKeys =
    managerOfflineLocksBreakLunch && status === "unavailable"
      ? ([] as string[])
      : [status];

  return (
    <div className="flex w-full flex-col items-start gap-[12px]">
      <Chip
        classNames={{
          base: config?.base ?? "rounded-[16px]",
          content:
            config?.content ??
            "text-center text-[12px] not-italic font-medium leading-[17.359px]",
        }}
      >
        {config?.label ?? STATUS_LABELS[status] ?? status}
      </Chip>

      <Select
        placeholder={t("queue_select_status_placeholder")}
        selectedKeys={new Set(selectSelectedKeys)}
        onSelectionChange={(keys) => {
          const key =
            typeof keys === "object" &&
            keys !== null &&
            Symbol.iterator in keys
              ? Array.from(keys as Set<string>)[0]
              : undefined;
          if (key && key in STATUS_LABELS) {
            onStatusChange(key as QueueProfileStatus);
          }
        }}
        classNames={SELECT_CLASSES_QUEUE_STATUS}
      >
        <SelectItem key="available">{t("queue_status_available")}</SelectItem>
        <SelectItem key="break" isDisabled={managerOfflineLocksBreakLunch}>
          {t("queue_status_break")}
        </SelectItem>
        <SelectItem key="lunch" isDisabled={managerOfflineLocksBreakLunch}>
          {t("queue_status_lunch")}
        </SelectItem>
        {canSelectUnavailable ? (
          <SelectItem key="unavailable">{t("queue_status_unavailable")}</SelectItem>
        ) : null}
      </Select>

      <div className="flex items-center justify-between gap-[8px] self-stretch px-[16px] py-[10px] rounded-[16px] bg-[#F4F6FB]">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]">
            {t("queue_work_desk")}
          </span>
          <span className="text-[#1A3C7E] text-[16px] font-medium leading-[normal]">
            {deskLabel}
          </span>
        </div>
        {status === "unavailable" && (
          <Button
            size="sm"
            variant="flat"
            onPress={onOpenDeskModal}
            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E] text-[13px] font-medium h-[32px] min-w-[32px] px-[10px]"
          >
            {t("queue_edit")}
          </Button>
        )}
      </div>
    </div>
  );
}
