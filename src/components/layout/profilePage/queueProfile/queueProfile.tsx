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
    isDeskModalOpen,
    pendingStatus,
  } = useAppSelector((s) => s.queueProfile);

  const isWaitingForNext = status === "available" && phase === "waitingForNext";
  const isWithClient = status === "available" && phase === "withClient";

  // Загрузка: профиль менеджера (me) → branchId, статус, currentCounterId; список всех окон по branchId (/counters)
  useEffect(() => {
    getManagerProfile().then(async (profileRes) => {
      if (!profileRes.data) return;
      const { status: backendStatus, branch, currentCounterId } = profileRes.data;
      const branchId = branch?.id;
      let desks: { key: string; label: string }[] = [];
      if (branchId) {
        const countersRes = await getCounters(branchId);
        if (countersRes.data?.length) {
          desks = countersRes.data.map((c) => ({
            key: c.id,
            label: (c.code as string) || c.id,
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
        })
      );
    });
  }, [dispatch]);

  useEffect(() => {
    if (isDeskModalOpen) {
      setDraftDesk(selectedDesk);
      setNewDeskName("");
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

  const handleAddDesk = () => {
    const trimmed = newDeskName.trim();
    if (!trimmed || desks.length >= MAX_DESKS) return;
    const key = `desk_custom_${Date.now()}`;
    dispatch(addDesk({ key, label: trimmed }));
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
        onDraftDeskChange={setDraftDesk}
        onNewDeskNameChange={setNewDeskName}
        onAddDesk={handleAddDesk}
        onConfirm={handleConfirmDeskAndGoOnline}
        onCancel={() => dispatch(cancelDeskModal())}
      />
    </div>
  );
}
