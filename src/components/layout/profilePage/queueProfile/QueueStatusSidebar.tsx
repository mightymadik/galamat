"use client";

import { Button, Chip, Select, SelectItem } from "@heroui/react";
import type { DeskItem } from "@/store/queueProfileSlice";
import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import { STATUS_CHIP_CONFIG, STATUS_LABELS } from "./constants";

const SELECT_CLASSES = {
  base: "w-full",
  label: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  trigger: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
  listbox: "text-[#1A3C7E] text-[16px] not-italic font-normal leading-[normal]",
};

export type QueueStatusSidebarProps = {
  status: QueueProfileStatus;
  selectedDesk: string;
  desks: DeskItem[];
  onStatusChange: (status: QueueProfileStatus) => void;
  onOpenDeskModal: () => void;
};

export default function QueueStatusSidebar({
  status,
  selectedDesk,
  desks,
  onStatusChange,
  onOpenDeskModal,
}: QueueStatusSidebarProps) {
  const config = STATUS_CHIP_CONFIG[status];
  const deskLabel =
    desks.find((d) => d.key === selectedDesk)?.label ?? (selectedDesk || "—");

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
        placeholder="Выберите статус"
        selectedKeys={[status]}
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
        classNames={SELECT_CLASSES}
      >
        <SelectItem key="available">Доступен</SelectItem>
        <SelectItem key="break">Перерыв</SelectItem>
        <SelectItem key="lunch">Обед</SelectItem>
        <SelectItem key="unavailable">Недоступен</SelectItem>
      </Select>

      <div className="flex items-center justify-between gap-[8px] self-stretch px-[16px] py-[10px] rounded-[16px] bg-[#F4F6FB]">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]">
            Рабочее окно
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
            Изменить
          </Button>
        )}
      </div>
    </div>
  );
}
