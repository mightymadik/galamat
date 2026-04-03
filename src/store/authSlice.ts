// store/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { sendAuthCode, verifyAuthCode, checkAuth, registerAuth, logoutAuth, createAuthSession } from "@/store/authThunks";

interface AuthState {
  isOpen: boolean;
  step: "phone" | "verification" | "registration" | "successSpin" | "successDefault";
  phone?: string;
  isRegistered?: boolean;
  firstName?: string;
  lastName?: string;

  isSendingCode: boolean;
  sendCodeError?: string | null;
  otpExpiresInSec: number;
  verifyError?: string | null;
  attemptsLeft?: number | null;
  isVerifyingCode: boolean;

  accessToken?: string;
  user?: {
    id: number;
    documentId: string;
    phone: string;
    role: string;
    name?: string;
    surname?: string;
  };

  isRegistering: boolean;
  registerError?: string | null;
}

const initialState: AuthState = {
  isOpen: false,
  step: "phone",
  isRegistered: false,

  isSendingCode: false,
  sendCodeError: null,
  otpExpiresInSec: 180,
  verifyError: null,
  attemptsLeft: null,
  isVerifyingCode: false,

  isRegistering: false,
  registerError: null,
};

const authSlice = createSlice({
  name: "authModal",
  initialState,
  reducers: {
    openAuth: (state) => {
      state.isOpen = true;
      state.step = "phone";
      state.sendCodeError = null;
    },
    closeAuth: (state) => {
      state.isOpen = false;
      state.step = "phone";
      state.phone = "";
      state.firstName = "";
      state.lastName = "";
      state.isRegistered = false;

      state.sendCodeError = null;
      state.isSendingCode = false;
      state.otpExpiresInSec = 180;

      // по желанию: чистить сессию при закрытии модалки или нет
      // state.accessToken = undefined;
      // state.user = undefined;
    },
    changeNumber: (state) => {
      state.step = "phone";
      state.phone = "";
      state.isRegistered = false;
      state.sendCodeError = null;
      state.isSendingCode = false;
    },
    setStep: (state, action: PayloadAction<AuthState["step"]>) => {
      state.step = action.payload;
    },
    setPhone: (state, action: PayloadAction<string>) => {
      state.phone = action.payload;
      state.sendCodeError = null;
    },
    setFirstName: (state, action: PayloadAction<string>) => {
      state.firstName = action.payload;
    },
    setLastName: (state, action: PayloadAction<string>) => {
      state.lastName = action.payload;
    },
    setRegistered: (state, action: PayloadAction<boolean>) => {
      state.isRegistered = action.payload;
    },
    clearVerifyError: (state) => {
      state.verifyError = null;
      state.attemptsLeft = null;
    },
    clearRegisterError: (state) => { state.registerError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerAuth.pending, (state) => {
        state.isRegistering = true;
        state.registerError = null;
      })
      .addCase(registerAuth.fulfilled, (state, action) => {
        state.isRegistering = false;
        state.user = action.payload.user;
        state.step = "successDefault";
      })
      .addCase(registerAuth.rejected, (state, action) => {
        state.isRegistering = false;
        state.registerError = action.payload?.message || "server_error";
      })
      .addCase(sendAuthCode.pending, (state) => {
        state.isSendingCode = true;
        state.sendCodeError = null;
      })
      .addCase(sendAuthCode.fulfilled, (state, action) => {
        state.isSendingCode = false;
        state.isRegistered = action.payload.isRegistered;
        state.otpExpiresInSec = action.payload.meta?.expiresInSec ?? 180;
        state.step = "verification";
      })
      .addCase(sendAuthCode.rejected, (state, action) => {
        state.isSendingCode = false;
        state.sendCodeError = action.payload?.message || "Ошибка отправки кода";
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = undefined;
      })
      .addCase(verifyAuthCode.pending, (state) => {
        state.isVerifyingCode = true;
        state.verifyError = null;
      })
      .addCase(verifyAuthCode.fulfilled, (state, action) => {
        state.isVerifyingCode = false;
        state.user = action.payload.user;
        state.verifyError = null;
        state.attemptsLeft = null;
      })
      .addCase(verifyAuthCode.rejected, (state, action) => {
        state.isVerifyingCode = false;

        const msg = action.payload?.message || "server_error";
        state.verifyError = msg;

        if (typeof action.payload?.meta?.attemptsLeft === "number") {
          state.attemptsLeft = action.payload.meta.attemptsLeft;
        }
      })
      .addCase(logoutAuth.fulfilled, (state) => {
        state.user = undefined;
      })
      .addCase(logoutAuth.rejected, (state) => {
        state.user = undefined;
      });
    builder
      .addCase(createAuthSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
      });
  },
});

export const {
  openAuth,
  closeAuth,
  changeNumber,
  setStep,
  setPhone,
  setFirstName,
  setLastName,
  setRegistered,
} = authSlice.actions;

export const clearVerifyError = authSlice.actions.clearVerifyError;
export const clearRegisterError = authSlice.actions.clearRegisterError;

export default authSlice.reducer;