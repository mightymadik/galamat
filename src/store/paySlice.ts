import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Flat } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";

interface PayState {
  isOpen: boolean;
  step: "reserve" | "payment" | "contacts" | "contractNumber" | "sign";
  flat: Flat | null;
  paymentMethod: string | null;
  /** Сделка, созданная при старте брони (менеджер/админ) — documentId для последующих шагов */
  dealDocumentId: string | null;
  /** Данные для генерации договора (заполняется при переходе с шага оплаты на контакты) */
  agreementPayload: AgreementPayload | null;
  /** Прямая ссылка на сгенерированный договор (для отправки в TrustMe или скачивания ПДБ) */
  agreementFileUrl: string | null;
  /** "pdb" = преддоговор (скачать); "ddu" = ДДУ (онлайн-подпись TrustMe/Doodocs) */
  agreementTemplateType: "pdb" | "ddu" | null;
  /** Номер договора из generate (agreementCode-house-apartment/entrance) для имени в Doodocs */
  agreementNumber: string | null;
}

const initialState: PayState = {
  isOpen: false,
  step: "reserve",
  flat: null,
  paymentMethod: null,
  dealDocumentId: null,
  agreementPayload: null,
  agreementFileUrl: null,
  agreementTemplateType: null,
  agreementNumber: null,
};

const paySlice = createSlice({
  name: "payModal",
  initialState,
  reducers: {
    openPay: (
      state,
      action: PayloadAction<{
        flat: Flat;
        paymentMethod: string;
        /** Для менеджера/админа: открыть на шаге "бронь", сделка уже создана */
        step?: "reserve" | "payment" | "contacts" | "contractNumber" | "sign";
        dealDocumentId?: string | null;
      }>
    ) => {
      const flat: Flat = {
        ...action.payload.flat,
        price: Number(action.payload.flat.price),
      };

      state.isOpen = true;
      state.flat = flat;
      state.paymentMethod = action.payload.paymentMethod;
      state.dealDocumentId = action.payload.dealDocumentId ?? null;
      state.agreementPayload = null;
      state.agreementFileUrl = null;
      state.agreementTemplateType = null;
      state.agreementNumber = null;
      state.step = action.payload.step ?? "payment";
    },

    closePay: (state) => {
      state.isOpen = false;
      state.step = "payment";
      state.flat = null;
      state.paymentMethod = null;
      state.dealDocumentId = null;
      state.agreementPayload = null;
      state.agreementFileUrl = null;
      state.agreementTemplateType = null;
      state.agreementNumber = null;
    },

    setStep: (
      state,
      action: PayloadAction<"payment" | "contacts" | "contractNumber" | "sign">
    ) => {
      state.step = action.payload;
    },

    setAgreementPayload: (state, action: PayloadAction<AgreementPayload | null>) => {
      state.agreementPayload = action.payload;
    },

    setAgreementFileUrl: (state, action: PayloadAction<string | null>) => {
      state.agreementFileUrl = action.payload;
    },

    setAgreementTemplateType: (state, action: PayloadAction<"pdb" | "ddu" | null>) => {
      state.agreementTemplateType = action.payload;
    },

    setAgreementNumber: (state, action: PayloadAction<string | null>) => {
      state.agreementNumber = action.payload;
    },

    setDealDocumentId: (state, action: PayloadAction<string | null>) => {
      state.dealDocumentId = action.payload;
    },
  },
});

export const { openPay, closePay, setStep, setDealDocumentId } = paySlice.actions;

export const setAgreementPayload = paySlice.actions.setAgreementPayload;
export const setAgreementFileUrl = paySlice.actions.setAgreementFileUrl;
export const setAgreementTemplateType = paySlice.actions.setAgreementTemplateType;
export const setAgreementNumber = paySlice.actions.setAgreementNumber;

export default paySlice.reducer;
