"use client";

import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { useTranslations } from "next-intl";

function managerStatusLabel(
  tr: ReturnType<typeof useTranslations>,
  status: string,
): string {
  switch (status) {
    case "AVAILABLE":
      return tr("queue_status_available");
    case "BREAK":
      return tr("queue_status_break");
    case "LUNCH":
      return tr("queue_status_lunch");
    case "OFFLINE":
      return tr("queue_status_unavailable");
    default:
      return status;
  }
}

export default function AdminManagersUnavailableModal({
  isOpen,
  managers,
  listLoading,
  forcingId,
  onClose,
  onForceOffline,
}: {
  isOpen: boolean;
  managers: Array<{ id: string; name: string; status: string }>;
  listLoading?: boolean;
  forcingId: string | null;
  onClose: () => void;
  onForceOffline: (managerId: string) => void;
}) {
  const t = useTranslations();

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
            {t("queue_admin_managers_unavailable_title")}
          </span>
        </ModalHeader>
        <ModalBody>
          <p className="text-[rgba(7,7,31,0.48)] text-[14px] leading-[normal] mb-4">
            {t("queue_admin_managers_unavailable_hint")}
          </p>
          {listLoading ? (
            <p className="text-[rgba(7,7,31,0.48)] text-[14px]">{t("loading")}</p>
          ) : managers.length === 0 ? (
            <p className="text-[rgba(7,7,31,0.48)] text-[14px]">
              {t("queue_admin_managers_unavailable_empty")}
            </p>
          ) : (
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
                    <span className="text-[rgba(7,7,31,0.48)] text-[13px]">
                      {managerStatusLabel(t, m.status)}
                    </span>
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
          )}
        </ModalBody>
        <ModalFooter className="flex flex-wrap justify-end">
          <Button
            variant="flat"
            onPress={onClose}
            className="rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
          >
            {t("queue_cancel")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
