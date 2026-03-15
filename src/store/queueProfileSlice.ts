import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type QueueProfileStatus = "available" | "break" | "lunch" | "unavailable";
export type QueueProfilePhase = "withClient" | "waitingForNext";
/** При withClient: "waiting" — клиент вызван, ждём у окна; "servicing" — обслуживаем. */
export type CallServicePhase = "waiting" | "servicing";

export type DeskItem = { key: string; label: string };

export const MAX_DESKS = 30;

/** Список окон приходит только из API (counters менеджера). Начальное состояние — пусто. */
export interface QueueProfileState {
  status: QueueProfileStatus;
  phase: QueueProfilePhase;
  callServicePhase: CallServicePhase;
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
}

const initialState: QueueProfileState = {
  status: "unavailable",
  phase: "waitingForNext",
  callServicePhase: "waiting",
  frozenWaitingSeconds: 0,
  waitingElapsedSeconds: 0,
  pendingStatus: null,
  isStatusModalOpen: false,
  isHistoryOpen: false,
  selectedDesk: "",
  desks: [],
  nextDeskId: 1,
  branchId: "",
  isDeskModalOpen: false,
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
    /** Ручное открытие модала (только из статуса "недоступен") */
    openDeskModal: (state) => {
      state.isDeskModalOpen = true;
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
    },
    setWithClient: (state) => {
      state.phase = "withClient";
      state.callServicePhase = "waiting";
      state.frozenWaitingSeconds = 0;
      state.waitingElapsedSeconds = 0;
    },
    startServicing: (state, action: PayloadAction<number>) => {
      state.callServicePhase = "servicing";
      state.frozenWaitingSeconds = action.payload;
    },
    setWaitingElapsed: (state, action: PayloadAction<number>) => {
      state.waitingElapsedSeconds = action.payload;
    },
    toggleHistory: (state) => {
      state.isHistoryOpen = !state.isHistoryOpen;
    },
    setHistoryOpen: (state, action: PayloadAction<boolean>) => {
      state.isHistoryOpen = action.payload;
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
  setWaitingElapsed,
  toggleHistory,
  setHistoryOpen,
  setProfileFromApi,
} = queueProfileSlice.actions;

export default queueProfileSlice.reducer;

