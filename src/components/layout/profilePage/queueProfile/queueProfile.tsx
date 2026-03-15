"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { QueueProfileStatus } from "@/store/queueProfileSlice";
import {
  cancelStatusChange,
  confirmStatusChange,
  goToWaitingForNext,
  requestStatusChange,
  setWithClient,
  startServicing,
  toggleHistory,
  openDeskModal,
  confirmDeskAndGoOnline,
  cancelDeskModal,
  addDesk,
  MAX_DESKS,
  setProfileFromApi,
} from "@/store/queueProfileSlice";
import { WAITING_TIMER_SEC } from "./constants";
import QueueMainPanel from "./panels/QueueMainPanel";
import WelcomeModal from "./panels/WelcomeModal";
import QueueStatusSidebar from "./QueueStatusSidebar";
import QueueSidebarContent from "./QueueSidebarContent";
import QueueNextClientsList from "./QueueNextClientsList";
import { StatusChangeModal, DeskSelectionModal } from "./modals";
import {
  getManagerProfile,
  getCounters,
  createCounter,
  setManagerStatus,
  setManagerCurrentCounter,
  toBackendStatus,
} from "./api/queueManagerApi";

function backendStatusToUi(backend: string): QueueProfileStatus {
  const map: Record<string, QueueProfileStatus> = {
    AVAILABLE: "available",
    OFFLINE: "unavailable",
    BREAK: "break",
    LUNCH: "lunch",
  };
  return map[backend] ?? "unavailable";
}

export default function QueueProfile() {
  const [redirectWindow, setRedirectWindow] = useState("");
  const [countdown, setCountdown] = useState(WAITING_TIMER_SEC);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [draftDesk, setDraftDesk] = useState("");
  const [newDeskName, setNewDeskName] = useState("");
  const [queueAccessDenied, setQueueAccessDenied] = useState(false);
  const [addDeskLoading, setAddDeskLoading] = useState(false);
  const [addDeskError, setAddDeskError] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const {
    status,
    phase,
    callServicePhase,
    waitingElapsedSeconds,
    isStatusModalOpen,
    isHistoryOpen,
    selectedDesk,
    desks,
    branchId,
    isDeskModalOpen,
    pendingStatus,
  } = useAppSelector((s) => s.queueProfile);

  const isWaitingForNext = status === "available" && phase === "waitingForNext";
  const isWithClient = status === "available" && phase === "withClient";
  const user = useAppSelector((s) => s.auth.user);
  const canAddDesks = user?.role === "admin";

  // Загрузка: профиль менеджера (me) → branchId, статус, currentCounterId; список всех окон по branchId (/counters)
  useEffect(() => {
    setQueueAccessDenied(false);
    getManagerProfile().then(async (profileRes) => {
      if (profileRes.status === 403 || profileRes.error === "forbidden") {
        setQueueAccessDenied(true);
        return;
      }
      if (!profileRes.data) return;
      const { status: backendStatus, branch, currentCounterId } = profileRes.data;
      const branchId = branch?.id;
      let desks: { key: string; label: string }[] = [];
      if (branchId) {
        const countersRes = await getCounters(branchId);
        if (countersRes.data?.length) {
          const availableCounters = countersRes.data.filter(
            (c) => (c.status ?? "available") === "available"
          );
          desks = availableCounters.map((c) => ({
            key: (c.documentId ?? c.id) as string,
            label: (c.name as string) || (c.code as string) || String(c.id),
          }));
        }
      }
      const chosenDesk =
        currentCounterId && desks.some((d) => d.key === currentCounterId)
          ? currentCounterId
          : desks[0]?.key ?? "";
      dispatch(
        setProfileFromApi({
          status: backendStatusToUi(backendStatus),
          desks,
          selectedDesk: chosenDesk,
          branchId: branchId ?? "",
        })
      );
    });
  }, [dispatch]);

  useEffect(() => {
    if (isDeskModalOpen) {
      setDraftDesk(selectedDesk);
      setNewDeskName("");
      setAddDeskError(null);
    }
  }, [isDeskModalOpen, selectedDesk]);

  useEffect(() => {
    if (!isWaitingForNext) {
      setCountdown(WAITING_TIMER_SEC);
      return;
    }
    if (countdown <= 0) {
      dispatch(setWithClient());
      setShowWelcomeModal(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isWaitingForNext, countdown, dispatch]);

  const handleStatusChange = (key: QueueProfileStatus) => {
    dispatch(requestStatusChange(key));
  };

  const handleAddDesk = async () => {
    const trimmed = newDeskName.trim();
    if (!trimmed || desks.length >= MAX_DESKS || !branchId) return;
    setAddDeskError(null);
    setAddDeskLoading(true);
    const nextNumber = desks.length + 1;
    const res = await createCounter({
      branchId,
      name: trimmed,
      number: nextNumber,
      code: `WINDOW_${nextNumber}`,
    });
    setAddDeskLoading(false);
    if (res.error || !res.data) {
      setAddDeskError(res.error ?? "Не удалось создать окно");
      return;
    }
    const key = (res.data.documentId ?? res.data.id?.toString() ?? `desk_${Date.now()}`) as string;
    const label = res.data.name ?? trimmed;
    dispatch(addDesk({ key, label }));
    setDraftDesk(key);
    setNewDeskName("");
  };

  const handleRedirect = () => {
    if (redirectWindow) {
      setCountdown(WAITING_TIMER_SEC);
      dispatch(goToWaitingForNext());
      setRedirectWindow("");
    }
  };

  const handleFinishService = () => {
    setCountdown(WAITING_TIMER_SEC);
    dispatch(goToWaitingForNext());
  };

  const handleCallClient = () => {
    dispatch(setWithClient());
    setShowWelcomeModal(true);
  };

  const handleConfirmStatusChange = useCallback(async () => {
    if (!pendingStatus) return;
    const backendStatus = toBackendStatus(pendingStatus);
    const res = await setManagerStatus(backendStatus);
    if (res.ok) dispatch(confirmStatusChange());
    // при ошибке можно показать toast; модал остаётся открытым
  }, [pendingStatus, dispatch]);

  const handleConfirmDeskAndGoOnline = useCallback(async () => {
    if (!draftDesk) return;
    const counterRes = await setManagerCurrentCounter(draftDesk);
    if (!counterRes.ok) return;
    const statusRes = await setManagerStatus("AVAILABLE");
    if (statusRes.ok) dispatch(confirmDeskAndGoOnline(draftDesk));
  }, [draftDesk, dispatch]);

  if (queueAccessDenied) {
    return (
      <div className="wrapper h-full flex flex-col gap-[32px]">
        <div className="rounded-[24px] border border-[rgba(19,44,94,0.12)] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#1A3C7E] text-[18px] font-medium">
            Доступ только для менеджеров и администраторов
          </p>
          <p className="mt-2 text-[rgba(7,7,31,0.48)] text-[14px]">
            Войдите под учётной записью с ролью «Менеджер» или «Администратор».
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper h-full flex flex-col gap-[32px]">
      <div className="flex flex-col lg:flex-row gap-[16px]">
        <div className="flex flex-col lg:min-w-[710px] w-full h-full items-start gap-[16px] self-stretch rounded-[24px] bg-[#F4F6FB]">
          <QueueMainPanel
            status={status}
            phase={phase}
            isHistoryOpen={isHistoryOpen}
            onToggleHistory={() => dispatch(toggleHistory())}
          />
        </div>

        <div className="flex w-full flex-col items-start gap-[12px]">
          <QueueStatusSidebar
            status={status}
            selectedDesk={selectedDesk}
            desks={desks}
            onStatusChange={handleStatusChange}
            onOpenDeskModal={() => dispatch(openDeskModal())}
          />

          {isWithClient ? (
            <QueueSidebarContent
              mode="withClient"
              redirectWindow={redirectWindow}
              callServicePhase={callServicePhase}
              waitingElapsedSeconds={waitingElapsedSeconds}
              onRedirectWindowChange={setRedirectWindow}
              onRedirect={handleRedirect}
              onClientArrived={() => dispatch(startServicing(waitingElapsedSeconds))}
              onFinishService={handleFinishService}
            />
          ) : isWaitingForNext ? (
            <QueueSidebarContent
              mode="waitingForNext"
              countdown={countdown}
              onCallClient={handleCallClient}
            />
          ) : null}
        </div>
      </div>

      {status === "available" && <QueueNextClientsList />}

      <StatusChangeModal
        isOpen={isStatusModalOpen}
        pendingStatus={pendingStatus}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => dispatch(cancelStatusChange())}
      />

      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        clientName="Кудайбергенова Асель Галаматовна"
        ticketNumber={124}
        managerName="Алем"
      />

      <DeskSelectionModal
        isOpen={isDeskModalOpen}
        draftDesk={draftDesk}
        newDeskName={newDeskName}
        desks={desks}
        canAddDesks={canAddDesks}
        addDeskLoading={addDeskLoading}
        addDeskError={addDeskError}
        onDraftDeskChange={setDraftDesk}
        onNewDeskNameChange={setNewDeskName}
        onAddDesk={handleAddDesk}
        onConfirm={handleConfirmDeskAndGoOnline}
        onCancel={() => dispatch(cancelDeskModal())}
      />
    </div>
  );
}
