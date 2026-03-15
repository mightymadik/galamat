"use client";

import { Button } from "@heroui/button";
import {
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from "@heroui/react";
import type { DeskItem } from "@/store/queueProfileSlice";
import { MAX_DESKS } from "@/store/queueProfileSlice";

export type DeskSelectionModalProps = {
  isOpen: boolean;
  draftDesk: string;
  newDeskName: string;
  desks: DeskItem[];
  canAddDesks: boolean;
  addDeskLoading?: boolean;
  addDeskError?: string | null;
  onDraftDeskChange: (key: string) => void;
  onNewDeskNameChange: (value: string) => void;
  onAddDesk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeskSelectionModal({
  isOpen,
  draftDesk,
  newDeskName,
  desks,
  canAddDesks,
  addDeskLoading = false,
  addDeskError = null,
  onDraftDeskChange,
  onNewDeskNameChange,
  onAddDesk,
  onConfirm,
  onCancel,
}: DeskSelectionModalProps) {
  const atMaxDesks = desks.length >= MAX_DESKS;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      placement="center"
      classNames={{
        base: "rounded-[24px] border border-[rgba(19,44,94,0.12)]",
        header: "border-b border-[rgba(19,44,94,0.07)]",
        body: "py-6",
        footer: "border-t border-[rgba(19,44,94,0.07)] gap-2",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <span className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
            Выбор рабочего окна
          </span>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-[16px]">
          <p className="text-[rgba(7,7,31,0.48)] text-[14px] font-normal leading-[20px]">
            Выберите рабочее окно перед тем, как перейти в статус{" "}
            <span className="font-medium text-[#1A3C7E]">«Доступен»</span>
          </p>

          <Select
            label="Рабочее окно"
            placeholder="Выберите окно"
            selectedKeys={draftDesk ? [draftDesk] : []}
            onSelectionChange={(keys) => {
              const key = Array.from(keys as Set<string>)[0];
              if (key) onDraftDeskChange(String(key));
            }}
            classNames={{
              base: "w-full",
              label: "text-[#1A3C7E] text-[14px] font-normal",
              trigger: "text-[#1A3C7E] text-[16px] font-normal",
              listbox: "text-[#1A3C7E] text-[16px] font-normal",
            }}
          >
            {desks.map((desk) => (
              <SelectItem key={desk.key}>{desk.label}</SelectItem>
            ))}
          </Select>
          {canAddDesks && (
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <span className="text-[#282D3C] text-[14px] font-medium leading-[normal]">
                  Добавить окно
                </span>
                <span
                  className={`text-[12px] font-normal ${atMaxDesks ? "text-[#DB1D31]" : "text-[rgba(7,7,31,0.40)]"}`}
                >
                  {desks.length} / {MAX_DESKS}
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <Input
                  placeholder="Название окна"
                  value={newDeskName}
                  onValueChange={onNewDeskNameChange}
                  isDisabled={atMaxDesks || addDeskLoading}
                  maxLength={40}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAddDesk();
                  }}
                  classNames={{
                    base: "flex-1",
                    input: "text-[#1A3C7E] text-[14px]",
                    inputWrapper:
                      "rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-[#F4F6FB]",
                  }}
                />
                <Button
                  isDisabled={!newDeskName.trim() || atMaxDesks || addDeskLoading}
                  isLoading={addDeskLoading}
                  onPress={onAddDesk}
                  className="rounded-[12px] bg-[#1A3C7E] text-white h-[40px] min-w-[40px] px-[14px] disabled:opacity-40"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M8 2.667v10.666M2.667 8h10.666"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Button>
              </div>
              {addDeskError && (
                <p className="text-[#DB1D31] text-[12px] font-normal">
                  {addDeskError}
                </p>
              )}
              {atMaxDesks && (
                <p className="text-[#DB1D31] text-[12px] font-normal">
                  Достигнут максимум ({MAX_DESKS} окон)
                </p>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={onCancel}
            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
          >
            Отмена
          </Button>
          <Button
            isDisabled={!draftDesk}
            onPress={onConfirm}
            className="rounded-[12px] bg-[#1A3C7E] text-white disabled:opacity-50"
          >
            Подтвердить и выйти онлайн
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
