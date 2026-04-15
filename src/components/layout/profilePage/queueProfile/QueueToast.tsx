'use client'

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { CURRENT_TICKET_COOKIE } from "./constants";

type QueueToastProps = {
  onOpenQueue: () => void;
};

export default function QueueToast({ onOpenQueue }: QueueToastProps) {
  const { currentClient, status, phase } = useSelector(
    (state: RootState) => state.queueProfile,
  );
  const [cookieTicketCode, setCookieTicketCode] = useState<string | null>(null);

  useEffect(() => {
    const readCookieTicketCode = () => {
      if (typeof document === "undefined") return null;
      const entry = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${CURRENT_TICKET_COOKIE}=`));
      if (!entry) return null;
      const [, raw] = entry.split("=");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as
          | { client?: { code?: string | null } | null; code?: string | null }
          | null;
        if (!parsed || typeof parsed !== "object") return null;
        const nestedCode =
          typeof parsed.client?.code === "string" ? parsed.client.code : null;
        if (nestedCode && nestedCode.trim()) return nestedCode.trim();
        const legacyCode = typeof parsed.code === "string" ? parsed.code : null;
        if (legacyCode && legacyCode.trim()) return legacyCode.trim();
        return null;
      } catch {
        return null;
      }
    };

    const sync = () => setCookieTicketCode(readCookieTicketCode());
    sync();
    const id = window.setInterval(sync, 1000);
    return () => window.clearInterval(id);
  }, []);

  const ticketCode =
    (typeof currentClient?.code === "string" && currentClient.code.trim()
      ? currentClient.code.trim()
      : null) ?? cookieTicketCode;
  const hasActiveTicket = Boolean(ticketCode);
  const isWaitingOrWithClient =
    status === "available" &&
    (phase === "withClient" || phase === "waitingForNext");
  const shouldShowFromCookie = Boolean(cookieTicketCode);

  if (!hasActiveTicket || (!isWaitingOrWithClient && !shouldShowFromCookie)) {
    return null;
  }

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

