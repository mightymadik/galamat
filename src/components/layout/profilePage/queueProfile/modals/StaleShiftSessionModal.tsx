"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

/**
 * Сессия смены в Redis истекла, в БД менеджер ещё «онлайн» — вызовы не работают до снятия с линии администратором.
 */
export default function StaleShiftSessionModal({
  isOpen,
  onDismiss,
}: {
  isOpen: boolean;
  onDismiss: () => void;
}) {
  const t = useTranslations();

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={false}
      hideCloseButton
      placement="center"
      classNames={{
        base: "rounded-[24px] border border-[rgba(19,44,94,0.12)]",
        header: "border-b border-[rgba(19,44,94,0.07)]",
        body: "py-6",
        footer: "border-t border-[rgba(19,44,94,0.07)]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
            {t("queue_stale_shift_title")}
          </span>
        </ModalHeader>
        <ModalBody>
          <p className="text-[#282D3C] text-[16px] not-italic font-normal leading-[normal]">
            {t("queue_stale_shift_body")}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            onPress={onDismiss}
            className="w-full rounded-[12px] bg-[#1A3C7E] text-white"
          >
            {t("queue_stale_shift_dismiss_btn")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
