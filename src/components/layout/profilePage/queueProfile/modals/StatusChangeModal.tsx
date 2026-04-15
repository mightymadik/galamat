"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { getStatusLabels } from "../constants";
import type { StatusChangeModalProps } from "../types";
import { useTranslations } from "next-intl";

export default function StatusChangeModal({
  isOpen,
  pendingStatus,
  errorMessage = null,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: StatusChangeModalProps) {
  const t = useTranslations();
  const STATUS_LABELS = getStatusLabels(t);
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
            {t("queue_modal_status_title")}
          </span>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[normal]">
            {t("queue_modal_status_confirm")}{" "}
            <span className="font-medium text-[#1A3C7E]">
              {pendingStatus ? STATUS_LABELS[pendingStatus] ?? pendingStatus : ""}
            </span>
            ?
          </p>
          {errorMessage ? (
            <p className="text-[#DB1D31] text-[13px] font-normal leading-[18px]">{errorMessage}</p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={onCancel}
            isDisabled={confirmLoading}
            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
          >
            {t("queue_cancel")}
          </Button>
          <Button
            onPress={onConfirm}
            isDisabled={confirmLoading}
            isLoading={confirmLoading}
            className="rounded-[12px] bg-[#1A3C7E] text-white"
          >
            {t("queue_confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
