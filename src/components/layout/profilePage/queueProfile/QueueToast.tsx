'use client'

import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

type QueueToastProps = {
  onOpenQueue: () => void;
};

export default function QueueToast({ onOpenQueue }: QueueToastProps) {
  const t = useTranslations();
  const { currentClient, status, phase } = useSelector(
    (state: RootState) => state.queueProfile,
  );

  const hasActiveTicket = Boolean(currentClient?.code);
  const isWaitingOrWithClient =
    status === "available" &&
    (phase === "withClient" || phase === "waitingForNext");

  if (!hasActiveTicket || !isWaitingOrWithClient) {
    return null;
  }

  const ticketCode = currentClient!.code;

  return (
    <button
      type="button"
      onClick={onOpenQueue}
      className="fixed bottom-4 right-4 z-30 flex max-w-xs items-center gap-3 rounded-2xl bg-[#1A3C7E] px-4 py-3 text-left text-white shadow-lg hover:bg-[#163268] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-[#1A3C7E]"
    >
      <div className="flex flex-col">
        <span className="text-sm">
          <span className="font-semibold">{ticketCode}</span>
        </span>
      </div>
    </button>
  );
}

