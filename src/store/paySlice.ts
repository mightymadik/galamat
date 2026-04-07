import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Flat } from "@/types/flat";
import type { AgreementPayload } from "@/types/agreement";

export interface AgreementFileEntry {
  templateType: string;
  fileUrl: string;
  documentName?: string;
  signedAgreementDocumentId?: string;
  /** С бэкенда после генерации; если нет — считаем, что подпись может требоваться */
  requiresSigning?: boolean;
}

interface PayState {
  isOpen: boolean;
  step: "reserve" | "payment" | "scenario" | "contacts" | "approval" | "sign";
  flat: Flat | null;
  paymentMethod: string | null;
  dealDocumentId: string | null;
  agreementPayload: AgreementPayload | null;
  agreementFileUrl: string | null;
  agreementTemplateType: "pdb" | "ddu" | null;
  agreementNumber: string | null;
  agreementFiles: AgreementFileEntry[];
  baseContractType: "ДДУ" | "ПДБ" | null;
  /** null — пока не сгенерировали договор */
  signingRequired: boolean | null;
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
  agreementFiles: [],
  baseContractType: null,
  signingRequired: null,
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
        step?: "reserve" | "scenario" | "payment" | "contacts" | "approval" | "sign";
        dealDocumentId?: string | null;
        baseContractType?: "ДДУ" | "ПДБ" | null;
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
      state.agreementFiles = [];
      state.baseContractType = action.payload.baseContractType ?? null;
      state.signingRequired = null;
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
      state.agreementFiles = [];
      state.baseContractType = null;
      state.signingRequired = null;
    },

    setStep: (
      state,
      action: PayloadAction<"scenario" | "payment" | "contacts" | "approval" | "sign">
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

    setAgreementFiles: (state, action: PayloadAction<AgreementFileEntry[]>) => {
      state.agreementFiles = action.payload;
    },
    setBaseContractType: (state, action: PayloadAction<"ДДУ" | "ПДБ" | null>) => {
      state.baseContractType = action.payload;
    },

    setSigningRequired: (state, action: PayloadAction<boolean | null>) => {
      state.signingRequired = action.payload;
    },
  },
});

export const { openPay, closePay, setStep, setDealDocumentId } = paySlice.actions;

export const setAgreementPayload = paySlice.actions.setAgreementPayload;
export const setAgreementFileUrl = paySlice.actions.setAgreementFileUrl;
export const setAgreementTemplateType = paySlice.actions.setAgreementTemplateType;
export const setAgreementNumber = paySlice.actions.setAgreementNumber;
export const setAgreementFiles = paySlice.actions.setAgreementFiles;
export const setBaseContractType = paySlice.actions.setBaseContractType;
export const setSigningRequired = paySlice.actions.setSigningRequired;

export default paySlice.reducer;
