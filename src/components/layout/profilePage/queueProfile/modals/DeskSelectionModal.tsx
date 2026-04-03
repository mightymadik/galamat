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
import { useTranslations } from "next-intl";
import { SELECT_CLASSES_DESK_MODAL } from "../constants";
import type { DeskSelectionModalProps } from "../types";

export default function DeskSelectionModal({
  isOpen,
  mode,
  draftDesk,
  newDeskName,
  desks,
  canAddDesks,
  addDeskLoading = false,
  addDeskError = null,
  selectionError = null,
  onDraftDeskChange,
  onNewDeskNameChange,
  onAddDesk,
  onConfirm,
  onCancel,
}: DeskSelectionModalProps) {
  const t = useTranslations();
  const atMaxDesks = desks.length >= MAX_DESKS;
  const currentDeskLabel =
    desks.find((d) => d.key === draftDesk)?.label ?? (draftDesk || "—");

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
            {t("queue_desk_modal_title")}
          </span>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-[16px]">
          <p className="text-[rgba(7,7,31,0.48)] text-[14px] font-normal leading-[20px]">
            {t("queue_select_window_before_status_placeholder")} {" "}
            <span className="font-medium text-[#1A3C7E]">{t("queue_status_available_quoted")}</span>
          </p>

          {mode === "edit" ? (
            <div className="flex flex-col gap-[8px]">
              <span className="text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]">
                {t("queue_work_desk")}
              </span>
              <Select
                placeholder={t("queue_work_desk_placeholder")}
                selectedKeys={draftDesk ? [draftDesk] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0];
                  onDraftDeskChange(key != null ? String(key) : "");
                }}
                classNames={SELECT_CLASSES_DESK_MODAL}
              >
                {desks.map((d) => (
                  <SelectItem key={d.key}>{d.label}</SelectItem>
                ))}
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-[4px] rounded-[16px] bg-[#F4F6FB] px-[16px] py-[10px]">
              <span className="text-[rgba(7,7,31,0.48)] text-[12px] font-normal leading-[16px]">
                {t("queue_work_desk")}
              </span>
              <span className="text-[#1A3C7E] text-[16px] font-medium leading-[normal]">
                {currentDeskLabel}
              </span>
            </div>
          )}
          {selectionError && (
            <p className="text-[#DB1D31] text-[12px] font-normal">{selectionError}</p>
          )}
          {canAddDesks && (
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <span className="text-[#282D3C] text-[14px] font-medium leading-[normal]">
                  {t("queue_add_desk")}
                </span>
                <span
                  className={`text-[12px] font-normal ${atMaxDesks ? "text-[#DB1D31]" : "text-[rgba(7,7,31,0.40)]"}`}
                >
                  {desks.length} / {MAX_DESKS}
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <Input
                  placeholder={t("queue_desk_name_placeholder")}
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
                  {t("queue_desk_max", { max: MAX_DESKS })}
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
            {t("queue_cancel")}
          </Button>
          <Button
            isDisabled={!draftDesk}
            onPress={onConfirm}
            className="rounded-[12px] bg-[#1A3C7E] text-white disabled:opacity-50"
          >
            {mode === "edit" ? t("queue_confirm_desk") : t("queue_confirm_go_online")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
