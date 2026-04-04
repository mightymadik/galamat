import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type QueueProfileStatus = "available" | "break" | "lunch" | "unavailable";
export type QueueProfilePhase = "withClient" | "waitingForNext";
/** При withClient: "waiting" — клиент вызван, ждём у окна; "servicing" — обслуживаем. */
export type CallServicePhase = "waiting" | "servicing";

export interface CurrentClient {
  /** ID талона в очереди (Postgres) */
  id: string;
  /** Отображаемый номер талона (например, CA005) */
  code: string;
  /** Полное имя клиента (из Strapi или fallback) */
  name: string;
  /** Телефон клиента (из Strapi или очереди) */
  phone?: string | null;
  /** Фактическое время ожидания в секундах, рассчитанное на беке */
  waitTimeSeconds?: number | null;
  /** Название филиала для отображения */
  branchName?: string | null;
  /** Название услуги для отображения */
  serviceName?: string | null;
  /** Имя менеджера (может прийти из Strapi / managerName) */
  managerName?: string | null;
  /** Код окна (например, WINDOW_1) */
  counterCode?: string | null;
}

export interface ClientHistoryItem {
  id: string;
  name: string;
  phone?: string | null;
  /** ISO-строка даты обращения (createdAt / closedAt) */
  date?: string | null;
  service?: string | null;
  /** Время обслуживания в секундах */
  serviceTimeSeconds?: number | null;
  /** Время ожидания в секундах */
  waitTimeSeconds?: number | null;
  /** Имя менеджера */
  manager?: string | null;
}

export type DeskItem = { key: string; label: string };

export const MAX_DESKS = 30;

/** Список окон приходит только из API (counters менеджера). Начальное состояние — пусто. */
export interface QueueProfileState {
  status: QueueProfileStatus;
  phase: QueueProfilePhase;
  callServicePhase: CallServicePhase;
  /** Данные текущего клиента, которого сейчас обслуживает менеджер */
  currentClient: CurrentClient | null;
  /** История обращений текущего клиента */
  currentClientHistory: ClientHistoryItem[];
  frozenWaitingSeconds: number;
  waitingElapsedSeconds: number;
  pendingStatus: QueueProfileStatus | null;
  isStatusModalOpen: boolean;
  isHistoryOpen: boolean;
  /** Выбранное рабочее окно менеджера */
  selectedDesk: string;
  /** Список всех доступных окон (макс. MAX_DESKS) */
  desks: DeskItem[];
  /** Счётчик для генерации уникальных ключей новых окон */
  nextDeskId: number;
  /** ID филиала менеджера (для создания новых окон) */
  branchId: string;
  /** Модал выбора окна: открывается ТОЛЬКО при переходе unavailable → available */
  isDeskModalOpen: boolean;
  /** Режим модала выбора окна: выбор при старте смены или редактирование окна по кнопке «Изменить» */
  deskModalMode: "status" | "edit";
}

const initialState: QueueProfileState = {
  status: "unavailable",
  phase: "waitingForNext",
  callServicePhase: "waiting",
  frozenWaitingSeconds: 0,
  waitingElapsedSeconds: 0,
  currentClient: null,
  currentClientHistory: [],
  pendingStatus: null,
  isStatusModalOpen: false,
  isHistoryOpen: false,
  selectedDesk: "",
  desks: [],
  nextDeskId: 1,
  branchId: "",
  isDeskModalOpen: false,
  deskModalMode: "status",
};

const queueProfileSlice = createSlice({
  name: "queueProfile",
  initialState,
  reducers: {
    requestStatusChange: (state, action: PayloadAction<QueueProfileStatus>) => {
      const nextStatus = action.payload;
      if (nextStatus === state.status) return;
      // unavailable → available: обязательный выбор окна
      if (nextStatus === "available" && state.status === "unavailable") {
        state.isDeskModalOpen = true;
        state.deskModalMode = "status";
        return;
      }
      // Все остальные переходы (в т.ч. break/lunch → available): обычный статусный модал
      state.pendingStatus = nextStatus;
      state.isStatusModalOpen = true;
    },
    confirmStatusChange: (state) => {
      if (state.pendingStatus != null) {
        state.status = state.pendingStatus;
        state.pendingStatus = null;
      }
      state.isStatusModalOpen = false;
    },
    cancelStatusChange: (state) => {
      state.pendingStatus = null;
      state.isStatusModalOpen = false;
    },
    /** Ручное открытие модала (только из статуса "недоступен") по кнопке «Изменить» */
    openDeskModal: (state) => {
      state.isDeskModalOpen = true;
      state.deskModalMode = "edit";
    },
    /** Подтвердить выбор окна и перейти в "доступен" (из статуса "недоступен") */
    confirmDeskAndGoOnline: (state, action: PayloadAction<string>) => {
      state.selectedDesk = action.payload;
      state.status = "available";
      state.phase = "waitingForNext";
      state.isDeskModalOpen = false;
    },
    cancelDeskModal: (state) => {
      state.isDeskModalOpen = false;
    },
    /** Добавить новое окно. Ключ передаётся из компонента, чтобы его можно было сразу выбрать. */
    addDesk: (state, action: PayloadAction<DeskItem>) => {
      if (state.desks.length >= MAX_DESKS) return;
      state.desks.push(action.payload);
      state.nextDeskId += 1;
    },
    goToWaitingForNext: (state) => {
      state.status = "available";
      state.phase = "waitingForNext";
      state.callServicePhase = "waiting";
      state.frozenWaitingSeconds = 0;
      state.waitingElapsedSeconds = 0;
      state.currentClient = null;
      state.currentClientHistory = [];
    },
    setWithClient: (state) => {
      state.phase = "withClient";
      state.callServicePhase = "waiting";
      state.frozenWaitingSeconds = 0;
      state.waitingElapsedSeconds = 0;
      // текущий клиент должен быть установлен отдельным экшеном из ответа API
    },
    startServicing: (state) => {
      // При начале обслуживания фиксированное время ожидания не меняем,
      // только переключаем фазу.
      state.callServicePhase = "servicing";
    },
    /** Зафиксировать время ожидания (в секундах), пришедшее с бэка при вызове клиента */
    setFrozenWaitingSeconds: (state, action: PayloadAction<number>) => {
      state.frozenWaitingSeconds = action.payload;
    },
    setWaitingElapsed: (state, action: PayloadAction<number>) => {
      state.waitingElapsedSeconds = action.payload;
    },
    /** Обновить данные текущего клиента (после успешного вызова талона) */
    setCurrentClient: (state, action: PayloadAction<CurrentClient | null>) => {
      state.currentClient = action.payload;
    },
    setCurrentClientHistory: (state, action: PayloadAction<ClientHistoryItem[]>) => {
      state.currentClientHistory = action.payload;
    },
    toggleHistory: (state) => {
      state.isHistoryOpen = !state.isHistoryOpen;
    },
    setHistoryOpen: (state, action: PayloadAction<boolean>) => {
      state.isHistoryOpen = action.payload;
    },
    forceOffline(state) {
      state.status = "unavailable";
      state.phase = "waitingForNext";
      state.callServicePhase = "waiting";
      state.pendingStatus = null;
      state.isStatusModalOpen = false;
      state.isDeskModalOpen = false;
    },
    /** Синхронизация из API очереди: статус, список окон, выбранное окно, branchId */
    setProfileFromApi: (
      state,
      action: PayloadAction<{
        status: QueueProfileStatus;
        desks: DeskItem[];
        selectedDesk: string;
        branchId?: string;
      }>
    ) => {
      const { status, desks, selectedDesk, branchId } = action.payload;
      state.status = status;
      state.desks = desks;
      state.selectedDesk = selectedDesk || (desks[0]?.key ?? "");
      if (branchId !== undefined) state.branchId = branchId;
    },
  },
});

export const {
  requestStatusChange,
  confirmStatusChange,
  cancelStatusChange,
  openDeskModal,
  confirmDeskAndGoOnline,
  cancelDeskModal,
  addDesk,
  goToWaitingForNext,
  setWithClient,
  startServicing,
  setFrozenWaitingSeconds,
  setWaitingElapsed,
  setCurrentClient,
  setCurrentClientHistory,
  toggleHistory,
  setHistoryOpen,
  setProfileFromApi,
  forceOffline,
} = queueProfileSlice.actions;

export default queueProfileSlice.reducer;

