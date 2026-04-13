"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";
import type { OnlineManagerBlockingClose } from "../api/queueAdminShiftApi";
import { useAppSelector } from "@/store/hooks";

function managerStatusLabel(
  t: ReturnType<typeof useTranslations>,
  status: string,
): string {
  switch (status) {
    case "AVAILABLE":
      return t("queue_status_available");
    case "BREAK":
      return t("queue_status_break");
    case "LUNCH":
      return t("queue_status_lunch");
    case "OFFLINE":
      return t("queue_status_unavailable");
    default:
      return status;
  }
}

export default function BranchShiftCloseModal({
  isOpen,
  managers,
  forcingId,
  retryLoading,
  onClose,
  onForceOffline,
  onRetryClose,
  showManagerStatus = true,
}: {
  isOpen: boolean;
  managers: OnlineManagerBlockingClose[];
  forcingId: string | null;
  retryLoading?: boolean;
  onClose: () => void;
  onForceOffline: (managerId: string) => void;
  onRetryClose: () => void;
  /** Если false — в списке не показываем подпись статуса (например, все на линии как AVAILABLE). */
  showManagerStatus?: boolean;
}) {
  const t = useTranslations();

  const user = useAppSelector((s) => s.auth.user);
  managers = managers.filter((m) => m.id !== user?.documentId);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="center"
      size="lg"
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
            {t("queue_branch_shift_modal_title")}
          </span>
        </ModalHeader>
        <ModalBody>
          <p className="text-[rgba(7,7,31,0.48)] text-[14px] leading-[normal] mb-4">
            {t("queue_branch_shift_modal_hint")}
          </p>
          <ul className="flex flex-col gap-3">
            {managers.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-[16px] border border-[rgba(19,44,94,0.12)] bg-[#F4F6FB] px-4 py-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[#1E1E1E] text-[15px] font-medium truncate">
                    {m.name?.trim() || m.id}
                  </span>
                  {showManagerStatus ? (
                    <span className="text-[rgba(7,7,31,0.48)] text-[13px]">
                      {managerStatusLabel(t, m.status)}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  isLoading={forcingId === m.id}
                  isDisabled={forcingId != null && forcingId !== m.id}
                  onPress={() => onForceOffline(m.id)}
                  className="rounded-[12px] bg-[#1A3C7E] text-white shrink-0"
                >
                  {t("queue_branch_shift_force_offline")}
                </Button>
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter className="flex flex-wrap justify-end">
          <Button
            variant="flat"
            onPress={onClose}
            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
          >
            {t("queue_cancel")}
          </Button>
          <Button
            onPress={onRetryClose}
            isLoading={retryLoading}
            isDisabled={forcingId != null}
            className="rounded-[12px] bg-[#1A3C7E] text-white"
          >
            {t("queue_branch_shift_retry_close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
