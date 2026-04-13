import type {
  CallServicePhase,
  ClientHistoryItem,
  CurrentClient as StoreCurrentClient,
  QueueProfileStatus,
} from "@/store/queueProfileSlice";

/** Payload, который хранится в cookie для активного талона менеджера. */
export type CurrentTicketCookiePayload =
  | {
      client: StoreCurrentClient;
      callServicePhase?: CallServicePhase;
      managerId?: string;
    }
  // для обратной совместимости со старыми куками, где хранился только CurrentClient
  | (StoreCurrentClient & { callServicePhase?: CallServicePhase });

/** Generic option с id и name для списков услуг/менеджеров. */
export type RedirectOption = { id: string; name: string };

/** Тикет в списке «следующие клиенты». */
export type QueueTicket = {
  id: string;
  position?: number;
  name: string;
  code: string;
};

/** Пропсы списка следующих клиентов. */
export type QueueNextClientsListProps = {
  /** ID филиала менеджера — при наличии подписываемся на сокет и обновляем список при создании тикета */
  branchId?: string;
  /** Показать кнопки вызова по строкам (РОП — тихий вызов выбранного талона) */
  showRowCallActions?: boolean;
  /** РОП: кнопка «Вызвать» у талона (тихо, без табло; окно — как у РОП в смене) */
  isAdmin?: boolean;
  onCallRow?: (ticketId: string) => void;
};

/** Базовые пропсы для модала приветствия клиента. */
export type WelcomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** ФИО вызванного клиента */
  clientName?: string;
  /** Номер талона */
  ticketNumber?: string | number;
  /** Имя менеджера (оператора) */
  managerName?: string;
};

/** Пропсы модала выбора рабочего окна. */
export type DeskSelectionModalProps = {
  isOpen: boolean;
  /** Режим открытия модала:
   *  - "status" — при переходе в статус «Доступен» (показываем выбранное окно без списка)
   *  - "edit"   — по кнопке «Изменить» (даём выбрать любое доступное окно)
   */
  mode: "status" | "edit";
  draftDesk: string;
  newDeskName: string;
  desks: { key: string; label: string }[];
  canAddDesks: boolean;
  addDeskLoading?: boolean;
  confirmLoading?: boolean;
  addDeskError?: string | null;
  /** Ошибка выбора окна (например, окно уже занято) */
  selectionError?: string | null;
  onDraftDeskChange: (key: string) => void;
  onNewDeskNameChange: (value: string) => void;
  onAddDesk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Пропсы модала смены статуса. */
export type StatusChangeModalProps = {
  isOpen: boolean;
  pendingStatus: QueueProfileStatus | null;
  /** Текст ошибки API при подтверждении смены статуса */
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** История клиента для панели вызова. */
export type ClientHistory = ClientHistoryItem[];

/** Пропсы сайдбара статуса. */
export type QueueStatusSidebarProps = {
  status: QueueProfileStatus;
  selectedDesk: string;
  desks: { key: string; label: string }[];
  onStatusChange: (status: QueueProfileStatus) => void;
  onOpenDeskModal: () => void;
  /** Если false — пункт «Недоступен» не показывается (завершение смены — только через администратора). */
  canSelectUnavailable?: boolean;
};

/** Пропсы правой панели в зависимости от режима. */
export type QueueSidebarContentProps =
  | {
      mode: "withClient";
      /** Текущая выбранная услуга для перенаправления */
      redirectServiceId: string;
      /** Доступные услуги для перенаправления */
      redirectServices: RedirectOption[];
      /** Текущий выбранный менеджер для перенаправления */
      redirectManagerId: string;
      /** Доступные менеджеры для выбранной услуги */
      redirectManagers: RedirectOption[];
      callServicePhase: CallServicePhase;
      onRedirectServiceChange: (serviceId: string) => void;
      onRedirectManagerChange: (managerId: string) => void;
      redirectReason: string;
      onRedirectReasonChange: (value: string) => void;
      onRedirect: () => void;
      onClientArrived: () => void;
      /** Пометить клиента как неявившегося */
      onNoShow: () => void;
      /** Завершить обслуживание (DONE) */
      onCompleteService: () => void;
      actionLoading?: boolean;
      /** Повторить озвучку вызова на табло (после вызова клиента) */
      onReannounceDisplay: () => void;
      reannounceLoading?: boolean;
      /** Секунд до следующего доступного повторного вызова (0 — можно жать) */
      reannounceCooldownSecondsLeft?: number;
      /** РОП: без кнопки «Вызвать ещё раз» на табло */
      isAdminView?: boolean;
    }
  | {
      mode: "waitingForNext";
      countdown: number;
      onCallClient: () => void;
      actionLoading?: boolean;
      /** РОП: вместо таймера — список менеджеров филиала */
      isAdminView?: boolean;
      /** Показать таймер вместе со списком менеджеров (спец-режим). */
      showCountdownWithManagers?: boolean;
      branchManagers?: Array<{ id: string; name: string; status?: string }>;
      branchManagersLoading?: boolean;
    };

