"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import type { QueueTicket, QueueNextClientsListProps } from "./types";
import { subscribeToQueueBranchUpdates } from "./api/queueRealtimeApi";
import { extractQueueApiErrorMessage, userFacingQueueError } from "./api/queueApiError";

/**
 * Список очереди, когда менеджер "Доступен".
 * Подгружает тикеты с queue-backend через Next.js API:
 * GET /api/queue/manager/queue-list.
 * По сокету подписывается на branch и при событии queue:update обновляет список.
 * У РОП (admin): кнопка «Вызвать» у строки — тихий вызов выбранного талона (сам РОП на своём окне).
 */
export default function QueueNextClientsList({
  branchId,
  showRowCallActions = false,
  isAdmin = false,
  onCallRow,
}: QueueNextClientsListProps) {
  const t = useTranslations();
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugReason, setDebugReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeSocket: (() => void) | null = null;

    async function loadTickets(silent = false) {
      if (!silent) {
        setLoading(true);
        setError(null);
        setDebugReason(null);
      }
      try {
        const res = await fetch("/api/queue/manager/queue-list", {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            const raw = extractQueueApiErrorMessage(json) ?? "queue_error";
            setError(raw);
            setTickets([]);
            setDebugReason(null);
          }
          return;
        }
        const rawData = (json as { data?: unknown }).data;
        const safeData = Array.isArray(rawData) ? (rawData as QueueTicket[]) : [];
        const list = safeData
          .filter((row) => row && row.id)
          .sort((a, b) => {
            const aPosition = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
            const bPosition = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
            if (aPosition !== bPosition) return aPosition - bPosition;
            return a.id.localeCompare(b.id);
          });
        if (!cancelled) {
          setTickets(list);
          setDebugReason(
            (json as { debug?: { reason?: string | null } })?.debug?.reason ?? null,
          );
        }
      } catch (e) {
        console.error("[QueueNextClientsList] failed to load tickets", e);
        if (!cancelled) {
          setError("queue_unavailable");
        }
      } finally {
        if (!cancelled && !silent) {
          setLoading(false);
        }
      }
    }

    void loadTickets();

    if (branchId && typeof window !== "undefined") {
      subscribeToQueueBranchUpdates(
        branchId,
        () => {
          if (!cancelled) void loadTickets(true);
        },
        { listen: ["queue"] },
      )
        .then((unsubscribe) => {
          if (cancelled) {
            unsubscribe?.();
            return;
          }
          unsubscribeSocket = unsubscribe;
        })
        .catch(() => {});
    }

    const handleRefresh = () => {
      if (!cancelled) void loadTickets(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("queue:refresh", handleRefresh);
    }

    return () => {
      cancelled = true;
      if (unsubscribeSocket) {
        unsubscribeSocket();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("queue:refresh", handleRefresh);
      }
    };
  }, [branchId]);

  const hasTickets = tickets.length > 0;
  const [first, ...rest] = tickets;
  const debugReasonText =
    debugReason === "manager_not_available"
      ? "Статус менеджера не Доступен"
      : debugReason === "manager_counter_not_selected"
        ? "Не выбрано окно менеджера"
        : debugReason === "shift_not_started_or_expired"
          ? "Смена не начата или истекла сессия смены"
          : debugReason === "manager_no_branch"
            ? "Менеджер не привязан к филиалу"
            : debugReason === "no_matching_tickets"
              ? "Нет подходящих талонов для этого менеджера"
              : null;

  const renderRowActions = (row: QueueTicket) => {
    if (!showRowCallActions || !onCallRow || !isAdmin) return null;
    return (
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          size="sm"
          radius="sm"
          className="min-w-[88px] h-8 text-[13px] bg-[#2655AF] text-white"
          onPress={() => onCallRow(row.id)}
        >
          {t("queue_call_btn")}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-full p-[16px] flex-col items-start gap-[16px] self-stretch rounded-[16px] bg-[#F4F6FB]">
      <div className="flex justify-between items-end self-stretch">
        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
          {t("queue_fullname")}
        </p>
        <p className="text-[#2C2D31] text-[14.956px] not-italic font-normal leading-[12px] opacity-40">
          {t("queue_ticket_number")}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center w-full py-4 text-[14px] text-[rgba(7,7,31,0.48)]">
          {t("queue_loading_queue")}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center justify-center w-full py-4 text-[14px] text-[#DB1D31] text-center px-2">
          {userFacingQueueError(error, t("queue_error_loading_queue"))}
        </div>
      )}

      {!loading && !error && !hasTickets && (
        <div className="flex flex-col items-center justify-center w-full py-4 text-[14px] text-[rgba(7,7,31,0.48)] gap-1">
          <span>{t("queue_no_one_in_queue")}</span>
          {debugReasonText && (
            <span className="text-[12px] text-[rgba(7,7,31,0.56)]">{debugReasonText}</span>
          )}
        </div>
      )}

      {!loading && !error && hasTickets && (
        <div className="flex flex-col items-start gap-[4px] flex-[1_0_0] self-stretch rounded-[4px]">
          <div className="flex flex-col items-start flex-[1_0_0] self-stretch rounded-[8px] bg-[#FFF]">
            {first && (
              <div className="flex px-[16px] py-[8px] justify-between items-center gap-3 self-stretch rounded-[8px] [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)] bg-[rgba(38,_85,_175,_0.24)]">
                <div className="flex flex-col justify-center items-start flex-[1_0_0] min-w-0 rounded-[8px]">
                  <p className="text-[#132C5E] text-[14px] not-italic font-bold leading-[24px]">
                    {t("queue_next_label")}
                  </p>
                  <span className="text-[#132C5E] text-[20px] not-italic font-normal leading-[24px] truncate w-full">
                    {first.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[#132C5E] text-[20px] not-italic font-medium leading-[24px]">
                    {first.code}
                  </span>
                  {renderRowActions(first)}
                </div>
              </div>
            )}

            {rest.map((row) => (
              <div
                key={row.id}
                className="flex px-[16px] py-[8px] justify-between items-center gap-3 self-stretch [border-bottom:1px_solid_rgba(19,_44,_94,_0.07)]"
              >
                <div className="flex flex-col justify-center items-start flex-[1_0_0] min-w-0 rounded-[8px]">
                  <span className="text-[#132C5E] text-[16px] not-italic font-normal leading-[24px] truncate w-full">
                    {row.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[#132C5E] text-[16px] not-italic font-medium leading-[24px]">
                    {row.code}
                  </span>
                  {renderRowActions(row)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
