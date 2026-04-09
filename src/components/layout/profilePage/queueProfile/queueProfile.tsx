"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { io, type Socket } from "socket.io-client";
import { getDefaultQueueSocketOptions } from "@/lib/queueSocket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type {
  QueueProfileStatus,
  CallServicePhase,
  ClientHistoryItem,
  CurrentClient,
} from "@/store/queueProfileSlice";
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
  setCurrentClient,
  setFrozenWaitingSeconds,
  setCurrentClientHistory,
  forceOffline,
} from "@/store/queueProfileSlice";
import {
  WAITING_TIMER_SEC,
  CURRENT_TICKET_COOKIE,
  backendStatusToUi,
} from "./constants";
import type { CurrentTicketCookiePayload, RedirectOption, QueueTicket } from "./types";
import QueueMainPanel from "./panels/QueueMainPanel";
import QueueStatusSidebar from "./QueueStatusSidebar";
import QueueSidebarContent from "./QueueSidebarContent";
import QueueNextClientsList from "./QueueNextClientsList";
import {
  StatusChangeModal,
  DeskSelectionModal,
  BranchShiftCloseModal,
  StaleShiftSessionModal,
  AdminManagersUnavailableModal,
} from "./modals";
import WelcomeModal from "./panels/WelcomeModal";
import {
  type ManagerProfile,
  getManagerProfile,
  getCounters,
  createCounter,
  setManagerStatus,
  setManagerCurrentCounter,
  toBackendStatus,
} from "./api/queueManagerApi";
import { subscribeToQueueBranchUpdates } from "./api/queueRealtimeApi";
import type { OnlineManagerBlockingClose } from "./api/queueAdminShiftApi";
import {
  fetchCurrentBranchShift,
  openBranchShift,
  closeBranchShift,
  forceManagerOfflineForShiftClose,
  fetchAvailableManagersForBranch,
} from "./api/queueAdminShiftApi";

/** Временно без паузы между повторными вызовами на табло (раньше 15 с). */
const REANNOUNCE_COOLDOWN_SEC = 15;

function normalizeServingAt(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }
  return null;
}

function sanitizeManagerDisplayName(
  rawName: string | null | undefined,
  managerId?: string | null,
): string | null {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) return null;
  if (managerId && name === managerId) return null;
  return name;
}

function saveCurrentTicketCookie(
  client: CurrentClient,
  callServicePhase: CallServicePhase = "waiting",
  managerId?: string,
) {
  if (typeof document === "undefined") return;
  try {
    const value = encodeURIComponent(
      JSON.stringify({
        client,
        callServicePhase,
        managerId,
      } satisfies CurrentTicketCookiePayload),
    );
    document.cookie = `${CURRENT_TICKET_COOKIE}=${value}; path=/; max-age=3600`;
  } catch {
    // ignore
  }
}

function clearCurrentTicketCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${CURRENT_TICKET_COOKIE}=; path=/; max-age=0`;
}

function readCurrentTicketCookie(expectedManagerId?: string):
  | {
      client: CurrentClient;
      callServicePhase: CallServicePhase;
    }
  | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CURRENT_TICKET_COOKIE}=`));
  if (!entry) return null;
  const [, raw] = entry.split("=");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as CurrentTicketCookiePayload | null;
    if (!parsed || typeof parsed !== "object") return null;

    // Новый формат: { client, callServicePhase }
    if ("client" in parsed && parsed.client && typeof parsed.client === "object") {
      const client = parsed.client as CurrentClient;
      const cookieManagerId =
        typeof parsed.managerId === "string" && parsed.managerId.trim()
          ? parsed.managerId.trim()
          : null;
      if (expectedManagerId && cookieManagerId !== expectedManagerId) return null;
      const phase: CallServicePhase =
        parsed.callServicePhase === "servicing" ? "servicing" : "waiting";
      return { client, callServicePhase: phase };
    }

    // Старый формат: сам объект — это CurrentClient
    const client = parsed as CurrentClient;
    if (!client.id || !client.code) return null;
    return { client, callServicePhase: "waiting" };
  } catch {
    return null;
  }
}

export default function QueueProfile() {
  const t = useTranslations();
  const [redirectServiceId, setRedirectServiceId] = useState("");
  const [redirectManagerId, setRedirectManagerId] = useState("");
  const [redirectReason, setRedirectReason] = useState("");
  const [countdown, setCountdown] = useState(WAITING_TIMER_SEC);
  const [hasNextClient, setHasNextClient] = useState(false);
  const autoCallTriggeredRef = useRef(false);
  const [draftDesk, setDraftDesk] = useState("");
  const [newDeskName, setNewDeskName] = useState("");
  const [queueAccessDenied, setQueueAccessDenied] = useState(false);
  const [deskSelectionError, setDeskSelectionError] = useState<string | null>(null);
  const [addDeskLoading, setAddDeskLoading] = useState(false);
  const [addDeskError, setAddDeskError] = useState<string | null>(null);
  const [deskConfirmLoading, setDeskConfirmLoading] = useState(false);
  const [isCallTicketModalOpen, setIsCallTicketModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reannounceLoading, setReannounceLoading] = useState(false);
  const [reannounceCooldownSecondsLeft, setReannounceCooldownSecondsLeft] =
    useState(0);

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
    deskModalMode,
    currentClient,
  } = useAppSelector((s) => s.queueProfile);

  const isWaitingForNext = status === "available" && phase === "waitingForNext";
  const isWithClient = status === "available" && phase === "withClient";
  const user = useAppSelector((s) => s.auth.user);
  const currentManagerId =
    user?.documentId != null
      ? String(user.documentId)
      : user?.id != null
        ? String(user.id)
        : "";
  const normalizedRole = String(user?.role ?? "").toLowerCase();
  const isAdminUser = normalizedRole === "admin" || normalizedRole === "rop";
  const canAddDesks = isAdminUser;
  const [branchShiftId, setBranchShiftId] = useState<string | null>(null);
  const [branchShiftLoading, setBranchShiftLoading] = useState(false);
  const [branchShiftActionLoading, setBranchShiftActionLoading] = useState(false);
  const [branchShiftBanner, setBranchShiftBanner] = useState<"open" | "close" | null>(null);
  const [branchShiftError, setBranchShiftError] = useState<string | null>(null);
  const [shiftCloseModalOpen, setShiftCloseModalOpen] = useState(false);
  const [shiftCloseManagers, setShiftCloseManagers] = useState<OnlineManagerBlockingClose[]>(
    [],
  );
  const [shiftCloseForcingId, setShiftCloseForcingId] = useState<string | null>(null);
  const shiftCloseAttemptIdRef = useRef<string | null>(null);
  const [staleShiftModalOpen, setStaleShiftModalOpen] = useState(false);
  const [adminUnavailableModalOpen, setAdminUnavailableModalOpen] = useState(false);
  const [adminUnavailableManagers, setAdminUnavailableManagers] = useState<
    Array<{ id: string; name: string; status: string }>
  >([]);
  const [adminUnavailableListLoading, setAdminUnavailableListLoading] = useState(false);
  const [adminUnavailableForcingId, setAdminUnavailableForcingId] = useState<string | null>(
    null,
  );
  const [redirectServices, setRedirectServices] = useState<RedirectOption[]>([]);
  const [redirectManagers, setRedirectManagers] = useState<RedirectOption[]>([]);
  /** РОП: список менеджеров филиала в сайдбаре вместо таймера */
  const [branchManagersForSidebar, setBranchManagersForSidebar] = useState<
    Array<{ id: string; name: string; status?: string }>
  >([]);
  const [branchManagersLoading, setBranchManagersLoading] = useState(false);
  const lastTicketStatusSyncAtRef = useRef(0);
  /** Avoid putting `currentClient` in useCallback/useEffect deps — object identity changes every dispatch and caused infinite re-runs (React #185). */
  const currentClientRef = useRef(currentClient);
  currentClientRef.current = currentClient;
  const callServicePhaseRef = useRef(callServicePhase);
  callServicePhaseRef.current = callServicePhase;

  const checkHasNextClients = useCallback(async () => {
    if (!branchId) {
      setHasNextClient(false);
      return;
    }

    try {
      const res = await fetch("/api/queue/manager/eligible-next-tickets", {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setHasNextClient(false);
        return;
      }

      const payload = json as {
        data?: QueueTicket[];
        debug?: { reason?: string | null };
      };
      const list = (payload.data ?? []).filter((t) => t && t.id);
      const reason = payload.debug?.reason ?? null;

      // Если бэк явно говорит, что «нет подходящих талонов» или «нет услуг» — не тикаем таймер.
      if (
        reason === "no_matching_tickets" ||
        reason === "manager_no_services" ||
        reason === "not_next_turn"
      ) {
        setHasNextClient(false);
        return;
      }

      setHasNextClient(list.length > 0);
    } catch {
      setHasNextClient(false);
    }
  }, [branchId]);

  const loadProfileIntoStore = useCallback(
    async (profileData: ManagerProfile) => {
      const { status: backendStatus, branch, currentCounterId } = profileData;
      const nextBranchId = branch?.id;
      const normalizedCurrentCounterId =
        currentCounterId != null ? String(currentCounterId) : "";
      let nextDesks: { key: string; label: string }[] = [];
      if (nextBranchId) {
        const countersRes = await getCounters(nextBranchId);
        if (countersRes.data?.length) {
          const availableCounters = countersRes.data.filter((c) => {
            const counterId =
              c.documentId != null
                ? String(c.documentId)
                : c.id != null
                  ? String(c.id)
                  : "";
            const statusRaw =
              c.status != null ? String(c.status).toLowerCase() : "available";
            const isAvailable = statusRaw === "available";

            // Текущее окно менеджера должно отображаться даже если оно занято.
            return isAvailable || (normalizedCurrentCounterId !== "" && counterId === normalizedCurrentCounterId);
          });
          nextDesks = availableCounters.map((c) => ({
            key:
              c.documentId != null
                ? String(c.documentId)
                : c.id != null
                  ? String(c.id)
                  : "",
            label: (c.name as string) || (c.code as string) || String(c.id),
          }));
        }
      }
      const chosenDesk =
        normalizedCurrentCounterId &&
        nextDesks.some((d) => d.key === normalizedCurrentCounterId)
          ? normalizedCurrentCounterId
          : nextDesks[0]?.key ?? "";
      dispatch(
        setProfileFromApi({
          status: backendStatusToUi(backendStatus),
          desks: nextDesks,
          selectedDesk: chosenDesk,
          branchId: nextBranchId ?? "",
        }),
      );
    },
    [dispatch],
  );

  const applyForcedOffline = useCallback(() => {
    dispatch(forceOffline());
    dispatch(setCurrentClient(null));
    dispatch(setCurrentClientHistory([]));
  
    clearCurrentTicketCookie();
  
    setIsCallTicketModalOpen(false);
    setRedirectServiceId("");
    setRedirectManagerId("");
    setRedirectReason("");
    setCountdown(WAITING_TIMER_SEC);
    setHasNextClient(false);
    setReannounceLoading(false);
    setReannounceCooldownSecondsLeft(0);
  
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("queue:refresh"));
    }
  }, [dispatch]);

  const clearActiveTicketState = useCallback(() => {
    setIsCallTicketModalOpen(false);
    setCountdown(WAITING_TIMER_SEC);
    dispatch(goToWaitingForNext());
    dispatch(setCurrentClient(null));
    dispatch(setCurrentClientHistory([]));
    clearCurrentTicketCookie();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("queue:refresh"));
    }
  }, [dispatch]);

  type TicketStatusSnapshot = {
    id?: string;
    status?: string;
    waitTimeSeconds?: number | null;
    ticketCode?: string;
    servingAt?: unknown;
    client?: { fullName?: string | null; phone?: string | null } | null;
    branch?: { name?: string | null } | null;
    service?: { name?: string | null; code?: string | null } | null;
    manager?: { id?: string | null; fullName?: string | null; name?: string | null } | null;
    counter?: { id?: string | null; code?: string | null } | null;
  };

  const syncTicketStateFromServer = useCallback(
    async (
      ticketId: string,
      baseClient: CurrentClient | null,
      phase: CallServicePhase,
      options?: { force?: boolean },
    ) => {
      const force = options?.force === true;
      const now = Date.now();
      // Guard against reconnect storms: keep this sync at most once per 5 seconds.
      if (!force && now - lastTicketStatusSyncAtRef.current < 5000) {
        return;
      }
      lastTicketStatusSyncAtRef.current = now;

      try {
        const res = await fetch(
          `/api/queue/manager/ticket-status?ticketId=${encodeURIComponent(ticketId)}`,
          { credentials: "include" },
        );
        if (!res.ok) return;

        const json = (await res.json().catch(() => ({}))) as {
          data?: TicketStatusSnapshot;
        };
        const ticket = json.data;
        if (!ticket || !ticket.id) return;

        const status = ticket.status;
        if (status === "DONE" || status === "NO_SHOW" || status === "CANCELLED") {
          clearActiveTicketState();
          return;
        }

        if (!isAdminUser) {
          const ticketManagerId =
            ticket.manager?.id != null ? String(ticket.manager.id) : "";
          const ticketCounterId =
            ticket.counter?.id != null ? String(ticket.counter.id) : "";
          if (!ticketManagerId || (currentManagerId && ticketManagerId !== currentManagerId)) {
            return;
          }
          if (selectedDesk && ticketCounterId && ticketCounterId !== selectedDesk) {
            return;
          }
        }

        const current = baseClient ?? currentClientRef.current ?? null;
        if (!current) return;

        const servingAtIso =
          status === "SERVING"
            ? normalizeServingAt(ticket.servingAt) ?? current.servingAt ?? null
            : null;

        const resolvedManagerName = sanitizeManagerDisplayName(
          ticket.manager?.fullName ?? ticket.manager?.name ?? null,
          ticket.manager?.id != null ? String(ticket.manager.id) : currentManagerId,
        );
        const updated: CurrentClient = {
          id: String(ticket.id),
          code: ticket.ticketCode ?? current.code,
          name: ticket.client?.fullName ?? current.name,
          phone: ticket.client?.phone ?? current.phone ?? null,
          waitTimeSeconds:
            typeof ticket.waitTimeSeconds === "number"
              ? ticket.waitTimeSeconds
              : current.waitTimeSeconds ?? null,
          branchName: ticket.branch?.name ?? current.branchName ?? null,
          serviceName:
            ticket.service?.name ?? ticket.service?.code ?? current.serviceName ?? null,
          managerName:
            resolvedManagerName ?? current.managerName ?? null,
          counterCode: ticket.counter?.code ?? current.counterCode ?? null,
          servingAt: servingAtIso,
        };

        dispatch(setWithClient());
        dispatch(setCurrentClient(updated));
        if (typeof updated.waitTimeSeconds === "number") {
          dispatch(setFrozenWaitingSeconds(updated.waitTimeSeconds));
        }
        if (status === "SERVING") {
          dispatch(startServicing());
        }
        saveCurrentTicketCookie(
          updated,
          status === "SERVING" ? "servicing" : phase,
          currentManagerId,
        );
      } catch {
        // ignore sync errors, next reconnect/poll will retry
      }
    },
    [clearActiveTicketState, currentManagerId, dispatch, isAdminUser, selectedDesk],
  );

  // Загрузка: профиль менеджера (me) → branchId, статус, currentCounterId; список всех окон по branchId (/counters)
  useEffect(() => {
    setQueueAccessDenied(false);
    getManagerProfile().then(async (profileRes) => {
      if (
        (profileRes.status === 403 || profileRes.error === "forbidden") &&
        normalizedRole !== "external_manager"
      ) {
        setQueueAccessDenied(true);
        return;
      }
      if (!profileRes.data) return;
      if (
        profileRes.data.needsPreviousShiftClosure &&
        user?.role === "manager"
      ) {
        setStaleShiftModalOpen(true);
      } else {
        setStaleShiftModalOpen(false);
      }
      await loadProfileIntoStore(profileRes.data);
    });
  }, [dispatch, loadProfileIntoStore, user?.role]);

  useEffect(() => {
    if (!branchShiftBanner) return;
    const tid = window.setTimeout(() => setBranchShiftBanner(null), 4000);
    return () => window.clearTimeout(tid);
  }, [branchShiftBanner]);

  useEffect(() => {
    if (!isAdminUser || !branchId) {
      setBranchShiftId(null);
      setBranchShiftLoading(false);
      return;
    }
    let cancelled = false;
    setBranchShiftLoading(true);
    void fetchCurrentBranchShift(branchId).then((r) => {
      if (cancelled) return;
      setBranchShiftLoading(false);
      setBranchShiftId(r.shiftId ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdminUser, branchId]);

  useEffect(() => {
    if (!adminUnavailableModalOpen || !branchId) return;
    let cancelled = false;
    let unsubscribeSocket: (() => void) | null = null;

    const loadManagers = () => {
      setAdminUnavailableListLoading(true);
      void fetchAvailableManagersForBranch(branchId).then((r) => {
        if (cancelled) return;
        setAdminUnavailableListLoading(false);
        if (r.ok) setAdminUnavailableManagers(r.managers);
        else setAdminUnavailableManagers([]);
      });
    };

    loadManagers();

    void subscribeToQueueBranchUpdates(branchId, loadManagers, {
      listen: ["managerStatus"],
    }).then((cleanup) => {
      unsubscribeSocket = cleanup;
    });

    return () => {
      cancelled = true;
      unsubscribeSocket?.();
    };
  }, [adminUnavailableModalOpen, branchId]);

  useEffect(() => {
    if (reannounceCooldownSecondsLeft <= 0) return;
    const t = window.setTimeout(() => {
      setReannounceCooldownSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [reannounceCooldownSecondsLeft]);

  useEffect(() => {
    setReannounceCooldownSecondsLeft(0);
  }, [currentClient?.id]);

  // Подписка на сокет по активному талону: сбрасываем currentClient и куки при NO_SHOW / DONE / CANCELLED
  useEffect(() => {
    if (!branchId || !currentClient?.id) return;
    if (typeof window === "undefined") return;

    const ticketId = currentClient.id;

    let cancelled = false;
    let socket: Socket | null = null;

    type TicketPayload = {
      id?: string;
      status?: string;
      waitTimeSeconds?: number | null;
      servingAt?: unknown;
      code?: string;
      name?: string;
      phone?: string | null;
      branch?: { name?: string | null } | null;
      service?: { name?: string | null; code?: string | null } | null;
      manager?: { name?: string | null } | null;
      counter?: { code?: string | null } | null;
    };

    const handleTicketUpdate = (data?: TicketPayload) => {
      if (cancelled) return;
      const status = data?.status;
      const terminal =
        status === "DONE" || status === "NO_SHOW" || status === "CANCELLED";

      // terminal-события (в т.ч. ticket-completed) шлются в комнату филиала — у всех менеджеров.
      // Сбрасываем UI только если это наш активный талон.
      if (terminal) {
        const eventTicketId =
          data?.id != null ? String(data.id) : undefined;
        if (eventTicketId !== String(ticketId)) {
          return;
        }
        clearActiveTicketState();
        return;
      }

      // Если статус не терминальный, можем освежить данные клиента и куку
      if (!data) return;
      const base = currentClientRef.current;
      if (!base || data.id !== base.id) return;
      {
        const st = data.status;
        let nextServingAt: string | null | undefined;
        if (st === "SERVING") {
          nextServingAt =
            normalizeServingAt(data.servingAt) ?? base.servingAt ?? null;
        } else if (st === "CALLED" || st === "WAITING") {
          nextServingAt = null;
        }
        const updated: CurrentClient = {
          id: base.id,
          code: data.code ?? base.code,
          name: data.name ?? base.name,
          phone: data.phone ?? base.phone ?? null,
          waitTimeSeconds:
            typeof data.waitTimeSeconds === "number"
              ? data.waitTimeSeconds
              : base.waitTimeSeconds ?? null,
          branchName: data.branch?.name ?? base.branchName ?? null,
          serviceName:
            data.service?.name ?? data.service?.code ?? base.serviceName ?? null,
          managerName:
            sanitizeManagerDisplayName(data.manager?.name ?? null, currentManagerId) ??
            base.managerName ??
            null,
          counterCode: data.counter?.code ?? base.counterCode ?? null,
          servingAt:
            nextServingAt !== undefined ? nextServingAt : base.servingAt ?? null,
        };
        dispatch(setCurrentClient(updated));
        if (typeof updated.waitTimeSeconds === "number") {
          dispatch(setFrozenWaitingSeconds(updated.waitTimeSeconds));
        }
        // сохраняем куку с текущей фазой (waiting/servicing), чтобы после перезагрузки
        // восстановить правильное состояние тикета
        saveCurrentTicketCookie(updated, callServicePhaseRef.current, currentManagerId);
      }
    };

    async function connect() {
      try {
        const res = await fetch("/api/queue/socket-token", {
          credentials: "include",
        });
        const body = (await res.json().catch(() => ({}))) as {
          queueApiUrl?: string;
        };
        if (cancelled || !res.ok) return;
        const socketUrl = body.queueApiUrl?.trim() || undefined;

        socket = io(socketUrl, {
          ...getDefaultQueueSocketOptions(),
        });

        socket.on("connect", () => {
          socket?.emit("subscribe:branch", branchId);
          socket?.emit("subscribe:ticket", ticketId);
          void syncTicketStateFromServer(
            ticketId,
            currentClientRef.current ?? null,
            callServicePhaseRef.current,
          );
        });

        socket.on("ticket:updated", (payload: TicketPayload) => {
          handleTicketUpdate(payload);
        });
        socket.on("ticket-no-show", (payload: TicketPayload) => {
          handleTicketUpdate({ ...payload, status: "NO_SHOW" });
        });
        socket.on("ticket-completed", (payload: TicketPayload) => {
          handleTicketUpdate({ ...payload, status: "DONE" });
        });
        socket.on("ticket-cancelled", (payload: TicketPayload) => {
          handleTicketUpdate({ ...payload, status: "CANCELLED" });
        });
      } catch {
        // игнорируем ошибки подключения сокета
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (socket && ticketId) {
        socket.emit("unsubscribe:ticket", ticketId);
        socket.removeAllListeners();
        socket.disconnect();
      }
    };
  }, [branchId, clearActiveTicketState, currentClient?.id, dispatch, syncTicketStateFromServer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    let cancelled = false;
    let socket: Socket | null = null;
    const managerId =
      user?.documentId != null
        ? String(user.documentId)
        : user?.id != null
          ? String(user.id)
          : "";
  
    const handleStatusUpdate = (payload?: { status?: string }) => {
      if (cancelled) return;
      if (payload?.status !== "OFFLINE") return;
  
      applyForcedOffline();
    };
  
    async function connect() {
      try {
        const res = await fetch("/api/queue/socket-token", {
          credentials: "include",
        });
  
        const body = (await res.json().catch(() => ({}))) as {
          queueApiUrl?: string;
        };
  
        if (cancelled || !res.ok) return;
  
        const socketUrl = body.queueApiUrl?.trim() || undefined;
  
        socket = io(socketUrl, {
          ...getDefaultQueueSocketOptions(),
        });

        socket.on("connect", () => {
          if (managerId) {
            socket?.emit("subscribe:manager", managerId);
          }
        });

        socket.on("status:update", handleStatusUpdate);
      } catch {
        // ignore
      }
    }
  
    void connect();
  
    return () => {
      cancelled = true;
  
      if (!socket) return;
      if (managerId) {
        socket.emit("unsubscribe:manager", managerId);
      }
      socket.off("connect");
      socket.off("status:update", handleStatusUpdate);
      socket.disconnect();
      socket = null;
    };
  }, [applyForcedOffline, user?.id, user?.documentId]);

  // Восстанавливаем активный талон из куки при перезагрузке страницы
  useEffect(() => {
    const saved = readCurrentTicketCookie(currentManagerId);
    if (!saved) return;
    const { client, callServicePhase } = saved;
    (async () => {
      // Валидация cookie: не восстанавливаем чужой талон при гонках/перезапуске вкладок.
      try {
        const statusRes = await fetch(
          `/api/queue/manager/ticket-status?ticketId=${encodeURIComponent(client.id)}`,
          { credentials: "include" },
        );
        if (!statusRes.ok) {
          clearCurrentTicketCookie();
          return;
        }
        const statusJson = (await statusRes.json().catch(() => ({}))) as {
          data?: {
            status?: string;
            manager?: { id?: string | null } | null;
            counter?: { id?: string | null } | null;
          };
        };
        const ticket = statusJson.data;
        if (!ticket) {
          clearCurrentTicketCookie();
          return;
        }
        if (
          ticket.status === "DONE" ||
          ticket.status === "NO_SHOW" ||
          ticket.status === "CANCELLED"
        ) {
          clearCurrentTicketCookie();
          return;
        }
        if (!isAdminUser) {
          const ticketManagerId =
            ticket.manager?.id != null ? String(ticket.manager.id) : "";
          const ticketCounterId =
            ticket.counter?.id != null ? String(ticket.counter.id) : "";
          if (!ticketManagerId || (currentManagerId && ticketManagerId !== currentManagerId)) {
            clearCurrentTicketCookie();
            return;
          }
          if (selectedDesk && ticketCounterId && ticketCounterId !== selectedDesk) {
            clearCurrentTicketCookie();
            return;
          }
        }
      } catch {
        clearCurrentTicketCookie();
        return;
      }

      // сначала переводим UI в режим "с клиентом"
      dispatch(setWithClient());
      dispatch(setCurrentClient(client));
      if (typeof client.waitTimeSeconds === "number") {
        dispatch(setFrozenWaitingSeconds(client.waitTimeSeconds));
      }

      if (callServicePhase === "servicing") {
        dispatch(startServicing());
      }

      // Подгружаем историю обращений для активного талона
      try {
        const res = await fetch(
          `/api/queue/manager/client-history?ticketId=${encodeURIComponent(client.id)}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          dispatch(setCurrentClientHistory([]));
          return;
        }
        const json = await res.json().catch(() => ({}));
        const history = (json as { history?: ClientHistoryItem[] }).history ?? [];
        dispatch(setCurrentClientHistory(history));
      } catch {
        dispatch(setCurrentClientHistory([]));
      }

      await syncTicketStateFromServer(client.id, client, callServicePhase, { force: true });
    })();
  }, [currentManagerId, dispatch, isAdminUser, selectedDesk, syncTicketStateFromServer]);

  // Загружаем список услуг для перенаправления по branchId
  useEffect(() => {
    if (!branchId || !isWithClient) {
      setRedirectServices([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/queue/services?branchId=${encodeURIComponent(branchId)}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          setRedirectServices([]);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const services = (json as { services?: RedirectOption[] }).services ?? [];
        setRedirectServices(services);
      } catch {
        setRedirectServices([]);
      }
    })();
  }, [branchId, isWithClient]);

  // Загружаем список менеджеров по branchId и выбранной услуге
  useEffect(() => {
    if (!branchId || !redirectServiceId || !isWithClient) {
      setRedirectManagers([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/queue/managers?branchId=${encodeURIComponent(
            branchId,
          )}&serviceId=${encodeURIComponent(redirectServiceId)}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          setRedirectManagers([]);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const managers = (json as { managers?: RedirectOption[] }).managers ?? [];
        setRedirectManagers(managers);
      } catch {
        setRedirectManagers([]);
      }
    })();
  }, [branchId, redirectServiceId, isWithClient]);

  useEffect(() => {
    if (isDeskModalOpen) {
      setDraftDesk(selectedDesk);
      setNewDeskName("");
      setAddDeskError(null);
      setDeskSelectionError(null);
      setDeskConfirmLoading(false);
    }
  }, [isDeskModalOpen, selectedDesk]);

  useEffect(() => {
    if (!isWaitingForNext) {
      setCountdown(WAITING_TIMER_SEC);
      autoCallTriggeredRef.current = false;
      return;
    }
    if (isAdminUser) {
      return;
    }
    if (!hasNextClient) {
      // Если клиентов нет — паузим таймер, чтобы countdown не тикал "в пустоту".
      if (countdown !== WAITING_TIMER_SEC) setCountdown(WAITING_TIMER_SEC);
      autoCallTriggeredRef.current = false;
      return;
    }

    if (countdown <= 0) return;

    const tId = setTimeout(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => clearTimeout(tId);
  }, [isWaitingForNext, hasNextClient, countdown, isAdminUser]);

  // Когда менеджер ожидает следующего клиента — отслеживаем появление/исчезновение next-tickets
  // и держим флаг hasNextClient синхронно.
  useEffect(() => {
    if (!isWaitingForNext || !branchId) {
      setHasNextClient(false);
      autoCallTriggeredRef.current = false;
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const refresh = () => {
      if (cancelled) return;
      void checkHasNextClients();
    };

    // Сразу грузим состояние (на случай, если очередь уже не пуста).
    refresh();

    void subscribeToQueueBranchUpdates(branchId, refresh, {
      listen: ["queue"],
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [branchId, isWaitingForNext, checkHasNextClients]);

  useEffect(() => {
    if (!isAdminUser || !branchId || !isWaitingForNext) {
      setBranchManagersForSidebar([]);
      setBranchManagersLoading(false);
      return;
    }
    let cancelled = false;
    let unsubscribeSocket: (() => void) | null = null;

    const loadManagers = () => {
      setBranchManagersLoading(true);
      void fetch(
        `/api/queue/managers?branchId=${encodeURIComponent(branchId)}`,
        { credentials: "include" },
      )
        .then(async (res) => {
          if (cancelled) return;
          if (!res.ok) {
            setBranchManagersForSidebar([]);
            return;
          }
          const j = (await res.json().catch(() => ({}))) as {
            managers?: Array<{ id: string; name: string; status?: string }>;
          };
          setBranchManagersForSidebar(j.managers ?? []);
        })
        .catch(() => {
          if (!cancelled) setBranchManagersForSidebar([]);
        })
        .finally(() => {
          if (!cancelled) setBranchManagersLoading(false);
        });
    };

    loadManagers();

    void subscribeToQueueBranchUpdates(branchId, loadManagers, {
      listen: ["managerStatus"],
    }).then((cleanup) => {
      unsubscribeSocket = cleanup;
    });

    return () => {
      cancelled = true;
      unsubscribeSocket?.();
    };
  }, [isAdminUser, branchId, isWaitingForNext]);

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
      setAddDeskError(res.error ?? t("queue_create_desk_error"));
      return;
    }
    const key = (res.data.documentId ?? res.data.id?.toString() ?? `desk_${Date.now()}`) as string;
    const label = res.data.name ?? trimmed;
    dispatch(addDesk({ key, label }));
    setDraftDesk(key);
    setNewDeskName("");
  };

  const handleRedirect = async () => {
    const reason = redirectReason.trim();
    if (!currentClient?.id || !redirectServiceId || !redirectManagerId || actionLoading) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/queue/manager/transfer-ticket?ticketId=${encodeURIComponent(currentClient.id)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetServiceId: redirectServiceId,
            targetManagerId: redirectManagerId,
            ...(reason ? { reason } : {}),
          }),
        },
      );
      if (!res.ok) {
        return;
      }
      setIsCallTicketModalOpen(false);
      setCountdown(WAITING_TIMER_SEC);
      dispatch(goToWaitingForNext());
      dispatch(setCurrentClient(null));
      dispatch(setCurrentClientHistory([]));
      setRedirectServiceId("");
      setRedirectManagerId("");
      setRedirectReason("");
      clearCurrentTicketCookie();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("queue:refresh"));
      }
    } catch {
      // игнорируем, UI не ломаем
    } finally {
      setActionLoading(false);
    }
  };

  const handleReannounceDisplay = async () => {
    if (
      !currentClient?.id ||
      reannounceLoading ||
      reannounceCooldownSecondsLeft > 0
    ) {
      return;
    }
    setReannounceLoading(true);
    try {
      const res = await fetch(
        `/api/queue/manager/reannounce-display?ticketId=${encodeURIComponent(currentClient.id)}`,
        {
          method: "PUT",
          credentials: "include",
        },
      );
      if (res.ok) {
        setReannounceCooldownSecondsLeft(REANNOUNCE_COOLDOWN_SEC);
      }
    } catch {
      // тихо, UI не ломаем
    } finally {
      setReannounceLoading(false);
    }
  };

  const handleClientArrived = async () => {
    if (!currentClient?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/queue/manager/start-ticket?ticketId=${encodeURIComponent(currentClient.id)}`,
        {
          method: "PUT",
          credentials: "include",
        },
      );
      if (!res.ok) {
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        data?: { servingAt?: unknown };
      };
      const servingAtIso =
        normalizeServingAt(body?.data?.servingAt) ?? new Date().toISOString();
      setIsCallTicketModalOpen(false);
      // переводим фазу в "обслуживание", не трогая зафиксированное время ожидания
      dispatch(startServicing());
      const client = currentClientRef.current;
      if (client) {
        const merged: CurrentClient = { ...client, servingAt: servingAtIso };
        dispatch(setCurrentClient(merged));
        saveCurrentTicketCookie(merged, "servicing", currentManagerId);
      }
    } catch {
      // игнорируем, UI не ломаем
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!currentClient?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/queue/manager/no-show-ticket?ticketId=${encodeURIComponent(currentClient.id)}`,
        {
          method: "PUT",
          credentials: "include",
        },
      );
      if (!res.ok) {
        return;
      }
      setIsCallTicketModalOpen(false);
      setCountdown(WAITING_TIMER_SEC);
      dispatch(goToWaitingForNext());
      clearCurrentTicketCookie();
    } catch {
      // игнорируем, UI не ломаем
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async () => {
    if (!currentClient?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/queue/manager/complete-ticket?ticketId=${encodeURIComponent(currentClient.id)}`,
        {
          method: "PUT",
          credentials: "include",
        },
      );
      if (!res.ok) {
        return;
      }
      setIsCallTicketModalOpen(false);
      setCountdown(WAITING_TIMER_SEC);
      dispatch(goToWaitingForNext());
      dispatch(setCurrentClient(null));
      dispatch(setCurrentClientHistory([]));
      clearCurrentTicketCookie();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("queue:refresh"));
      }
    } catch {
      // игнорируем, UI не ломаем
    } finally {
      setActionLoading(false);
    }
  };

  type CallTicketSuccessPayload = {
    success?: boolean;
    ticketId?: string;
    code?: string;
    name?: string;
    phone?: string | null;
    waitTimeSeconds?: number | null;
    branch?: { id?: string; name?: string | null } | null;
    service?: { id?: string; name?: string | null; code?: string | null } | null;
    manager?: { id?: string; name?: string | null } | null;
    counter?: { id?: string; code?: string | null; name?: string | null } | null;
    history?: ClientHistoryItem[];
  };

  const applyCallSuccessPayload = useCallback(
    (payload: CallTicketSuccessPayload | undefined) => {
      if (payload) {
        const payloadManagerId =
          payload.manager?.id != null ? String(payload.manager.id) : "";
        const payloadCounterId =
          payload.counter?.id != null ? String(payload.counter.id) : "";

        // Anti-race guard: обычный менеджер принимает только "свой" вызов.
        if (!isAdminUser) {
          if (!payloadManagerId || (currentManagerId && payloadManagerId !== currentManagerId)) {
            return;
          }
          if (selectedDesk && payloadCounterId && payloadCounterId !== selectedDesk) {
            return;
          }
        }

        const resolvedManagerName = sanitizeManagerDisplayName(
          payload.manager?.name ?? null,
          payloadManagerId || currentManagerId,
        );
        const current: CurrentClient = {
          id: payload.ticketId || "",
          code: payload.code || "",
          name: payload.name || "Клиент",
          phone: payload.phone ?? null,
          waitTimeSeconds:
            typeof payload.waitTimeSeconds === "number"
              ? payload.waitTimeSeconds
              : null,
          branchName: payload.branch?.name ?? null,
          serviceName: payload.service?.name ?? payload.service?.code ?? null,
          managerName: resolvedManagerName,
          counterCode: payload.counter?.code ?? null,
          servingAt: null,
        };
        dispatch(setWithClient());
        dispatch(setCurrentClient(current));
        if (typeof current.waitTimeSeconds === "number") {
          dispatch(setFrozenWaitingSeconds(current.waitTimeSeconds));
        }
        dispatch(setCurrentClientHistory(payload.history ?? []));
        saveCurrentTicketCookie(current, "waiting", currentManagerId);
        setIsCallTicketModalOpen(true);
      } else {
        dispatch(setCurrentClient(null));
        dispatch(setCurrentClientHistory([]));
        clearCurrentTicketCookie();
        setIsCallTicketModalOpen(false);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("queue:refresh"));
      }
    },
    [currentManagerId, dispatch, isAdminUser, selectedDesk],
  );

  const handleCallClient = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/queue/manager/call-next", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        return;
      }
      const json = await res.json().catch(() => ({}));
      const payload = (json as { data?: CallTicketSuccessPayload }).data;
      const payloadManagerId =
        payload?.manager?.id != null ? String(payload.manager.id) : "";

      // Защита от гонки: если талон уже закрепился за другим менеджером,
      // не переводим текущий UI в "с клиентом".
      if (!isAdminUser && currentManagerId && payloadManagerId !== currentManagerId) {
        await checkHasNextClients();
        return;
      }
      applyCallSuccessPayload(payload);
    } catch {
      // тихо игнорируем, чтобы не ломать UI
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, applyCallSuccessPayload, currentManagerId, checkHasNextClients, isAdminUser]);

  /** РОП: вызов выбранного талона тихо (без табло); сам РОП в смене и на своём окне — как в call-next. */
  const handleCallSpecificTicket = useCallback(
    async (ticketId: string) => {
      try {
        const res = await fetch("/api/queue/manager/call-ticket", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, silentBoard: true }),
        });
        if (!res.ok) {
          return;
        }
        const json = await res.json().catch(() => ({}));
        const payload = (json as { data?: CallTicketSuccessPayload }).data;
        applyCallSuccessPayload(payload);
      } catch {
        // тихо игнорируем
      }
    },
    [applyCallSuccessPayload],
  );

  // Автовызов следующего клиента, когда countdown закончился.
  // Если клиентов нет — не вызываем (и countdown не тикает из-за gating выше).
  useEffect(() => {
    if (!isWaitingForNext) return;
    if (isAdminUser) return;
    if (!hasNextClient) return;
    if (countdown > 0) return;
    if (autoCallTriggeredRef.current) return;

    autoCallTriggeredRef.current = true;
    void handleCallClient();
  }, [isWaitingForNext, hasNextClient, countdown, handleCallClient, isAdminUser]);

  const runCloseBranchShift = useCallback(
    async (shiftId: string) => {
      setBranchShiftActionLoading(true);
      setBranchShiftError(null);
  
      const result = await closeBranchShift(shiftId);
  
      setBranchShiftActionLoading(false);
  
      if (result.kind === "closed") {
        setBranchShiftId(null);
        setShiftCloseModalOpen(false);
        setShiftCloseManagers([]);
        shiftCloseAttemptIdRef.current = null;
        setBranchShiftBanner("close");
  
        applyForcedOffline();
  
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("queue:refresh"));
        }
        return;
      }
  
      if (result.kind === "unfinished") {
        setBranchShiftError(t("queue_branch_shift_error_unfinished"));
        return;
      }
  
      if (result.kind === "onlineManagers") {
        shiftCloseAttemptIdRef.current = shiftId;
        setShiftCloseManagers(result.managers);
        setShiftCloseModalOpen(true);
        return;
      }
  
      setBranchShiftError(t("queue_branch_shift_error_generic"));
    },
    [t, applyForcedOffline],
  );

  const handleAdminBranchShiftClick = useCallback(async () => {
    if (!branchId || branchShiftLoading || branchShiftActionLoading) return;
    setBranchShiftError(null);
    if (branchShiftId) {
      await runCloseBranchShift(branchShiftId);
      return;
    }
    setBranchShiftActionLoading(true);
    const opened = await openBranchShift(branchId);
    setBranchShiftActionLoading(false);
    if (opened.ok && opened.shiftId) {
      setBranchShiftId(opened.shiftId);
      setBranchShiftBanner("open");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("queue:refresh"));
      }
      return;
    }
    setBranchShiftError(t("queue_branch_shift_error_generic"));
  }, [
    branchId,
    branchShiftId,
    branchShiftLoading,
    branchShiftActionLoading,
    runCloseBranchShift,
    t,
  ]);

  const handleShiftCloseModalForceOffline = useCallback(
    async (managerId: string) => {
      const sid = shiftCloseAttemptIdRef.current ?? branchShiftId;
      if (!sid) return;
      setShiftCloseForcingId(managerId);
      const fr = await forceManagerOfflineForShiftClose(managerId);
      setShiftCloseForcingId(null);
      if (!fr.ok) {
        setBranchShiftError(t("queue_branch_shift_error_generic"));
        return;
      }
      await runCloseBranchShift(sid);
    },
    [branchShiftId, runCloseBranchShift, t],
  );

  const handleShiftCloseModalRetryClose = useCallback(async () => {
    const sid = shiftCloseAttemptIdRef.current ?? branchShiftId;
    if (!sid) return;
    await runCloseBranchShift(sid);
  }, [branchShiftId, runCloseBranchShift]);

  const handleAdminUnavailableForceOffline = useCallback(
    async (managerId: string) => {
      if (!branchId) return;
      setAdminUnavailableForcingId(managerId);
      const fr = await forceManagerOfflineForShiftClose(managerId);
      setAdminUnavailableForcingId(null);
      if (!fr.ok) {
        setBranchShiftError(t("queue_branch_shift_error_generic"));
        return;
      }
      const r = await fetchAvailableManagersForBranch(branchId);
      if (r.ok) setAdminUnavailableManagers(r.managers);
    },
    [branchId, t],
  );

  const handleConfirmStatusChange = useCallback(async () => {
    if (!pendingStatus) return;
    const backendStatus = toBackendStatus(pendingStatus);
    const res = await setManagerStatus(backendStatus);
    if (res.ok) dispatch(confirmStatusChange());
    // при ошибке можно показать toast; модал остаётся открытым
  }, [pendingStatus, dispatch]);

  const handleConfirmDeskAndGoOnline = useCallback(async () => {
    if (!draftDesk || deskConfirmLoading) return;
    setDeskSelectionError(null);
    setDeskConfirmLoading(true);
    try {
      const counterRes = await setManagerCurrentCounter(draftDesk);
      if (!counterRes.ok) {
        if (counterRes.status === 409) {
          // Для известных ошибок показываем только локализованный текст,
          // не подмешивая русское сообщение с бэка.
          setDeskSelectionError(t("queue_start_shift_error_busy"));
        } else {
          setDeskSelectionError(t("queue_start_shift_error_generic"));
        }
        return;
      }
      const statusRes = await setManagerStatus("AVAILABLE");
      if (statusRes.ok) {
        dispatch(confirmDeskAndGoOnline(draftDesk));
      } else {
        if (statusRes.error === "SHIFT_CLOSED") {
          setDeskSelectionError("Сначала откройте смену филиала");
        } else if (statusRes.status === 409) {
          setDeskSelectionError(t("queue_start_shift_error_busy"));
        } else {
          setDeskSelectionError(t("queue_start_shift_error_generic"));
        }
      }
    } finally {
      setDeskConfirmLoading(false);
    }
  }, [deskConfirmLoading, draftDesk, dispatch, t]);

  if (queueAccessDenied) {
    return (
      <div className="wrapper h-full flex flex-col gap-[32px]">
        <div className="rounded-[24px] border border-[rgba(19,44,94,0.12)] bg-[#F4F6FB] p-8 text-center">
          <p className="text-[#1A3C7E] text-[18px] font-medium">
            {t("queue_access_denied_title")}
          </p>
          <p className="mt-2 text-[rgba(7,7,31,0.48)] text-[14px]">
            {t("queue_access_denied_description")}
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
          {isAdminUser && branchId ? (
            <div className="flex flex-col gap-2 w-full">
              {branchShiftBanner === "open" ? (
                <p className="text-[13px] text-[#1A3C7E] font-medium px-1">
                  {t("queue_branch_shift_open_ok")}
                </p>
              ) : null}
              {branchShiftBanner === "close" ? (
                <p className="text-[13px] text-[#1A3C7E] font-medium px-1">
                  {t("queue_branch_shift_close_ok")}
                </p>
              ) : null}
              {branchShiftError ? (
                <p className="text-[13px] text-[#DB1D31] px-1">{branchShiftError}</p>
              ) : null}
              <Button
                onPress={() => void handleAdminBranchShiftClick()}
                isDisabled={branchShiftLoading || branchShiftActionLoading}
                isLoading={branchShiftActionLoading}
                className="flex h-[48px] w-full justify-center items-center rounded-[12px] bg-[#1A3C7E] text-white"
              >
                <span className="text-[15px] font-medium">
                  {branchShiftLoading
                    ? t("queue_branch_shift_loading")
                    : branchShiftId
                      ? t("queue_branch_shift_close")
                      : t("queue_branch_shift_start")}
                </span>
              </Button>
              <Button
                variant="flat"
                onPress={() => {
                  setBranchShiftError(null);
                  setAdminUnavailableModalOpen(true);
                }}
                className="flex h-[48px] w-full justify-center items-center rounded-[12px] border border-[rgba(19,44,94,0.24)] bg-white text-[#1A3C7E]"
              >
                <span className="text-[15px] font-medium">
                  {t("queue_admin_managers_unavailable_open")}
                </span>
              </Button>
            </div>
          ) : null}
          <QueueStatusSidebar
            status={status}
            selectedDesk={selectedDesk}
            desks={desks}
            onStatusChange={handleStatusChange}
            onOpenDeskModal={() => dispatch(openDeskModal())}
            canSelectUnavailable={isAdminUser}
          />

          {isWithClient ? (
            <QueueSidebarContent
              mode="withClient"
              redirectServiceId={redirectServiceId}
              redirectServices={redirectServices}
              redirectManagerId={redirectManagerId}
              redirectManagers={redirectManagers}
              callServicePhase={callServicePhase}
              onRedirectServiceChange={(id) => {
                setRedirectServiceId(id);
                setRedirectManagerId("");
                setRedirectReason("");
              }}
              onRedirectManagerChange={setRedirectManagerId}
              redirectReason={redirectReason}
              onRedirectReasonChange={setRedirectReason}
              onRedirect={handleRedirect}
              onClientArrived={handleClientArrived}
              onNoShow={handleNoShow}
              onCompleteService={handleCompleteService}
              actionLoading={actionLoading}
              onReannounceDisplay={handleReannounceDisplay}
              reannounceLoading={reannounceLoading}
              reannounceCooldownSecondsLeft={reannounceCooldownSecondsLeft}
              isAdminView={isAdminUser}
            />
          ) : isWaitingForNext ? (
            <QueueSidebarContent
              mode="waitingForNext"
              countdown={countdown}
              onCallClient={handleCallClient}
              actionLoading={actionLoading}
              isAdminView={isAdminUser}
              branchManagers={branchManagersForSidebar}
              branchManagersLoading={branchManagersLoading}
            />
          ) : null}
        </div>
      </div>

      {status === "available" && (
        <QueueNextClientsList
          branchId={branchId}
          showRowCallActions={
            status === "available" && (isWaitingForNext || isAdminUser)
          }
          isAdmin={isAdminUser}
          onCallRow={
            isAdminUser ? (id) => void handleCallSpecificTicket(id) : undefined
          }
        />
      )}

      <StatusChangeModal
        isOpen={isStatusModalOpen}
        pendingStatus={pendingStatus}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => dispatch(cancelStatusChange())}
      />

      <DeskSelectionModal
        isOpen={isDeskModalOpen}
        mode={deskModalMode}
        draftDesk={draftDesk}
        newDeskName={newDeskName}
        desks={desks}
        canAddDesks={canAddDesks}
        addDeskLoading={addDeskLoading}
        confirmLoading={deskConfirmLoading}
        addDeskError={addDeskError}
        selectionError={deskSelectionError}
        onDraftDeskChange={setDraftDesk}
        onNewDeskNameChange={setNewDeskName}
        onAddDesk={handleAddDesk}
        onConfirm={handleConfirmDeskAndGoOnline}
        onCancel={() => dispatch(cancelDeskModal())}
      />

      <WelcomeModal
        isOpen={isCallTicketModalOpen}
        onClose={() => setIsCallTicketModalOpen(false)}
        clientName={currentClient?.name ?? undefined}
        ticketNumber={currentClient?.code ?? undefined}
        managerName={
          sanitizeManagerDisplayName(currentClient?.managerName, currentManagerId) ??
          user?.name ??
          t("queue_default_manager_name")
        }
      />

      <BranchShiftCloseModal
        isOpen={shiftCloseModalOpen}
        managers={shiftCloseManagers}
        forcingId={shiftCloseForcingId}
        retryLoading={branchShiftActionLoading && shiftCloseForcingId == null}
        onClose={() => {
          setShiftCloseModalOpen(false);
          setShiftCloseManagers([]);
        }}
        onForceOffline={(id) => void handleShiftCloseModalForceOffline(id)}
        onRetryClose={() => void handleShiftCloseModalRetryClose()}
      />

      <AdminManagersUnavailableModal
        isOpen={adminUnavailableModalOpen}
        managers={adminUnavailableManagers}
        listLoading={adminUnavailableListLoading}
        forcingId={adminUnavailableForcingId}
        onClose={() => {
          setAdminUnavailableModalOpen(false);
          setAdminUnavailableManagers([]);
        }}
        onForceOffline={(id) => void handleAdminUnavailableForceOffline(id)}
      />

      <StaleShiftSessionModal
        isOpen={staleShiftModalOpen && user?.role === "manager"}
        onDismiss={() => setStaleShiftModalOpen(false)}
      />
    </div>
  );
}
