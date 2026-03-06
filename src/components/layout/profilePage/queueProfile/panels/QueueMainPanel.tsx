"use client";

import QueueBreakPanel from "./QueueBreakPanel";
import QueueCalledPanel from "./QueueCalledPanel";
import QueueLunchPanel from "./QueueLunchPanel";
import QueueUnavailablePanel from "./QueueUnavailablePanel";
import QueueWaitingForNextPanel from "./QueueWaitingForNextPanel";
import type { QueueProfilePhase, QueueProfileStatus } from "@/store/queueProfileSlice";

export default function QueueMainPanel({
  status,
  phase,
  isHistoryOpen,
  onToggleHistory,
}: {
  status: QueueProfileStatus;
  phase: QueueProfilePhase;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
}) {
  switch (status) {
    case "break":
      return <QueueBreakPanel />;
    case "lunch":
      return <QueueLunchPanel />;
    case "unavailable":
      return <QueueUnavailablePanel />;
    case "available":
      return phase === "withClient" ? (
        <QueueCalledPanel isHistoryOpen={isHistoryOpen} onToggleHistory={onToggleHistory} />
      ) : (
        <QueueWaitingForNextPanel />
      );
    default:
      return <QueueWaitingForNextPanel />;
  }
}

