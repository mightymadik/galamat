"use client";

import { Button, ButtonGroup, Select, SelectItem, Textarea } from "@heroui/react";
import { SELECT_CLASSES_QUEUE_SIDEBAR } from "./constants";
import { useTranslations } from "next-intl";
import type { QueueSidebarContentProps } from "./types";
import { useAppSelector } from "@/store/hooks";

export default function QueueSidebarContent(props: QueueSidebarContentProps) {
  const t = useTranslations();
  const user = useAppSelector((s) => s.auth.user);
  if (props.mode === "withClient") {
    const {
      redirectServiceId,
      redirectServices,
      redirectManagerId,
      redirectManagers,
      callServicePhase,
      onRedirectServiceChange,
      onRedirectManagerChange,
      redirectReason,
      onRedirectReasonChange,
      onRedirect,
      onClientArrived,
      onNoShow,
      onCompleteService,
      onReannounceDisplay,
      reannounceLoading = false,
      reannounceCooldownSecondsLeft = 0,
      isAdminView = false,
    } = props;
    const isWaiting = callServicePhase === "waiting";
    const reannounceDisabled =
      reannounceLoading || reannounceCooldownSecondsLeft > 0;

    return (
      <div className="flex flex-col items-start gap-[24px] self-stretch">
        <div className="flex p-[16px] flex-col items-start gap-[10px] self-stretch rounded-[24px] bg-[#F4F6FB]">
          <div className="flex flex-col items-start gap-[12px] self-stretch">
            <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
              {t("queue_redirect_title")}
            </h1>
            <div className="flex flex-col items-start gap-[12px] self-stretch">
              <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] not-italic font-normal leading-[normal]">
                {t("queue_redirect_choose")}
              </p>
              <Select
                placeholder={t("queue_redirect_placeholder")}
                selectedKeys={redirectServiceId ? [redirectServiceId] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0];
                  onRedirectServiceChange(key != null ? String(key) : "");
                }}
                classNames={SELECT_CLASSES_QUEUE_SIDEBAR}
              >
                {redirectServices.map((svc) => (
                  <SelectItem key={svc.id}>{svc.name}</SelectItem>
                ))}
              </Select>

              {redirectServiceId ? (
                <>
                  <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] not-italic font-normal leading-[normal] mt-[8px]">
                    {t("queue_redirect_choose_manager")}
                  </p>
                  <Select
                    placeholder={t("queue_redirect_placeholder_manager")}
                    selectedKeys={redirectManagerId ? [redirectManagerId] : []}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0];
                      onRedirectManagerChange(key != null ? String(key) : "");
                    }}
                    classNames={SELECT_CLASSES_QUEUE_SIDEBAR}
                  >
                    {redirectManagers.map((m) => (
                      <SelectItem key={m.id}>{m.name}</SelectItem>
                    ))}
                  </Select>

                  <p className="text-[rgba(7,_7,_31,_0.48)] text-[14px] not-italic font-normal leading-[normal] mt-[8px]">
                    {t("queue_redirect_reason_label")}
                  </p>
                  <Textarea
                    value={redirectReason}
                    onValueChange={onRedirectReasonChange}
                    minRows={2}
                    maxRows={5}
                    maxLength={2000}
                    placeholder={t("queue_redirect_reason_placeholder")}
                    classNames={{
                      input: "text-[14px]",
                      inputWrapper:
                        "rounded-[12px] border border-[rgba(19,44,94,0.16)] bg-white shadow-none",
                    }}
                  />
                </>
              ) : null}

              <Button
                isDisabled={
                  !redirectServiceId || !redirectManagerId || isWaiting
                }
                onPress={onRedirect}
                className="mt-[12px] flex w-[100%] h-[40px] p-0 min-w-[100%] min-h-[40px] justify-center items-center gap-[4px] rounded-[12px] bg-[#1A3C7E] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
                  {t("queue_redirect_btn")}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {isWaiting && !isAdminView ? (
          <Button
            isDisabled={reannounceDisabled}
            isLoading={reannounceLoading}
            onPress={onReannounceDisplay}
            className="flex h-[48px] min-h-[48px] w-full justify-center items-center rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E] disabled:opacity-50"
          >
            <span className="text-[15px] not-italic font-medium leading-[normal]">
              {reannounceCooldownSecondsLeft > 0
                ? t("queue_reannounce_display_cooldown", {
                    seconds: reannounceCooldownSecondsLeft,
                  })
                : t("queue_reannounce_display_btn")}
            </span>
          </Button>
        ) : null}

        {isWaiting ? (
          <div className="flex flex-col items-start gap-[12px] self-stretch">
            <p className="text-[#1E1E1E] text-[16px] not-italic font-medium leading-[normal]">
              {t("queue_client_arrived")}
            </p>
            <ButtonGroup className="w-full" size="lg" variant="flat">
              <Button
                onPress={onClientArrived}
                className="flex-1 rounded-[12px] bg-[#1A3C7E] text-[#FFF]"
              >
                {t("queue_yes")}
              </Button>
              <Button
                onPress={onNoShow}
                className="flex-1 rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
              >
                {t("queue_no")}
              </Button>
            </ButtonGroup>
          </div>
        ) : (
          <Button
            onPress={onCompleteService}
            className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] border-[1px] border-solid border-[rgba(19,44,94,0.24)] bg-[#DB1D31]"
          >
            <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
              {t("queue_finish_service")}
            </span>
          </Button>
        )}
      </div>
    );
  }

  const {
    countdown,
    onCallClient,
    isAdminView,
    branchManagers = [],
    branchManagersLoading = false,
  } = props;

  const managerStatusLabel = (status: string | undefined) => {
    const u = (status ?? "").toUpperCase();
    if (u === "AVAILABLE") return t("queue_manager_status_available");
    if (u === "BREAK") return t("queue_manager_status_break");
    if (u === "LUNCH") return t("queue_manager_status_lunch");
    if (u === "OFFLINE") return t("queue_manager_status_offline");
    if (u === "UNAVAILABLE") return t("queue_manager_status_unavailable");
    return status ?? "—";
  };
  
  const filteredBranchManagers = branchManagers?.filter((m) => m.id !== user?.documentId);
  
  return (
    <div className="flex flex-col items-start gap-[24px] self-stretch">
      <div className="flex p-[16px] flex-col items-start gap-[12px] self-stretch rounded-[24px] bg-[#F4F6FB]">
        <h1 className="text-[#1E1E1E] text-[20px] not-italic font-medium leading-[28px]">
          {isAdminView ? t("queue_rop_branch_managers_title") : t("queue_time_to_next")}
        </h1>
        {isAdminView ? (
          <div className="flex flex-col gap-2 w-full min-h-[120px] max-h-[320px] overflow-y-auto">
            {branchManagersLoading ? (
              <p className="text-[14px] text-[rgba(7,7,31,0.48)] py-2">{t("queue_loading_queue")}</p>
            ) : filteredBranchManagers?.length === 0 ? (
              <p className="text-[14px] text-[rgba(7,7,31,0.48)] py-2">{t("queue_rop_managers_empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2 w-full pr-1">
                {filteredBranchManagers?.map((m) => (
                  <li
                    key={m.id}
                    className="flex justify-between items-center gap-3 rounded-[12px] bg-white/90 px-3 py-2.5 border border-[rgba(19,44,94,0.08)]"
                  >
                    <span className="text-[#132C5E] text-[14px] font-medium leading-snug truncate min-w-0">
                      {m.name}
                    </span>
                    <span className="text-[12px] text-[rgba(7,7,31,0.55)] shrink-0">
                      {managerStatusLabel(m.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center self-stretch py-4">
            <span className="text-[#1A3C7E] text-[32px] not-italic font-bold tabular-nums">
              {countdown}с
            </span>
          </div>
        )}
      </div>
      {!isAdminView ? (
        <Button
          onPress={onCallClient}
          className="flex h-[52px] min-w-[52px] min-h-[52px] p-[15px] justify-center items-center gap-[4px] self-stretch rounded-[24px] bg-[#1A3C7E]"
        >
          <span className="text-[#FFF] text-[16px] not-italic font-medium leading-[normal]">
            {t("queue_call_btn")}
          </span>
        </Button>
      ) : null}
    </div>
  );
}
