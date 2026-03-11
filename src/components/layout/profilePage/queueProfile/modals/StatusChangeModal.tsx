"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import { STATUS_LABELS } from "../constants";

export type StatusChangeModalProps = {
  isOpen: boolean;
  pendingStatus: QueueProfileStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function StatusChangeModal({
  isOpen,
  pendingStatus,
  onConfirm,
  onCancel,
}: StatusChangeModalProps) {
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
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
            Изменение статуса
          </span>
        </ModalHeader>
        <ModalBody>
          <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[normal]">
            Вы уверены, что хотите изменить статус на{" "}
            <span className="font-medium text-[#1A3C7E]">
              {pendingStatus ? STATUS_LABELS[pendingStatus] ?? pendingStatus : ""}
            </span>
            ?
          </p>
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
            onPress={onConfirm}
            className="rounded-[12px] bg-[#1A3C7E] text-white"
          >
            Подтвердить
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
