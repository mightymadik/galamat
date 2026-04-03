// store/authThunks.ts
import { apiPost, apiGet, ApiError } from "@/lib/authApi";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeKzPhone } from "@/utils/phone";

export type SendCodeResponse = {
  status: "ok";
  isRegistered: boolean;
  meta: {
    phone: string;
    expiresInSec: number;
    resendCooldownSec: number;
  };
};

export type SendCodeReject = {
  status: "error";
  message: string;
};

export type VerifyCodeResponse = {
  status: "ok";
  sessionId?: number;
  user: { id: number; documentId: string; phone: string; role: string; name?: string; surname?: string };
};

export type VerifyCodeReject = {
  status: "error";
  message: string; // invalid_code | too_many_attempts | code_expired_or_not_found | server_error
  meta?: { attemptsLeft?: number };
};

export type RegisterResponse = {
  status: "ok";
  sessionId?: number;
  user: { id: number; documentId: string; phone: string; role: string; name?: string; surname?: string };
};

export type RegisterReject = {
  status: "error";
  message: string; // name_surname_required | customer_not_found | server_error
};

export const sendAuthCode = createAsyncThunk<
  SendCodeResponse,
  { phoneMasked: string },
  { rejectValue: SendCodeReject }
>("auth/sendCode", async ({ phoneMasked }, { rejectWithValue }) => {
  try {
    const phone = normalizeKzPhone(phoneMasked);
    const data = await apiPost<SendCodeResponse>("/api/auth/send-code", { phone });

    if (data?.status !== "ok") {
      return rejectWithValue({ status: "error", message: "send_code_failed" });
    }

    return data;
  } catch (e: any) {
    if (e instanceof ApiError) {
      // ждём, что backend вернёт {status:"error", message:"...", ...}
      return rejectWithValue(e.payload as SendCodeReject);
    }
    return rejectWithValue({ status: "error", message: e?.message || "send_code_failed" });
  }
});

export const verifyAuthCode = createAsyncThunk<
  VerifyCodeResponse,
  { phoneMasked: string; code: string; confirmOnly?: boolean; deviceId?: string },
  { rejectValue: VerifyCodeReject }
>("auth/verifyCode", async ({ phoneMasked, code, confirmOnly, deviceId }, { rejectWithValue }) => {
  try {
    const phone = normalizeKzPhone(phoneMasked);
    const data = await apiPost<VerifyCodeResponse>("/api/auth/verify-code", { phone, code, confirmOnly: confirmOnly !== false, deviceId });
    return data;
  } catch (e: any) {
    if (e instanceof ApiError) {
      return rejectWithValue(e.payload as VerifyCodeReject);
    }
    return rejectWithValue({ status: "error", message: e?.message || "server_error" });
  }
});

export type MeResponse = {
  status: "ok";
  user: { id: number; documentId: string; phone: string; role: string; name?: string; surname?: string };
};

export type MeReject = {
  status: "error";
  message: string;
};

export const checkAuth = createAsyncThunk<
  MeResponse,
  void,
  { rejectValue: MeReject }
>("auth/me", async (_, { rejectWithValue }) => {
  try {
    const data = await apiGet<MeResponse>("/api/auth/me");
    return data;
  } catch (e: any) {
    // On 401 (e.g. expired access token), try refresh then retry /me
    if (e instanceof ApiError && e.status === 401) {
      try {
        await apiPost<{ status: string }>("/api/auth/refresh", {});
        const data = await apiGet<MeResponse>("/api/auth/me");
        return data;
      } catch {
        // refresh failed or second /me failed — treat as unauthorized
      }
    }
    if (e instanceof ApiError) {
      return rejectWithValue(e.payload as MeReject);
    }
    return rejectWithValue({ status: "error", message: e?.message || "unauthorized" });
  }
});

export const registerAuth = createAsyncThunk<
  RegisterResponse,
  { phoneMasked: string; firstName: string; lastName: string; deviceId?: string },
  { rejectValue: RegisterReject }
>("auth/register", async ({ phoneMasked, firstName, lastName, deviceId }, { rejectWithValue }) => {
  try {
    const phone = normalizeKzPhone(phoneMasked);
    const data = await apiPost<RegisterResponse>("/api/auth/register", { phone, firstName, lastName, deviceId });
    return data;
  } catch (e: any) {
    if (e instanceof ApiError) {
      return rejectWithValue(e.payload as RegisterReject);
    }
    return rejectWithValue({ status: "error", message: e?.message || "server_error" });
  }
});

export const logoutAuth = createAsyncThunk<void, void>("auth/logout", async () => {
  await apiPost<{ status: string }>("/api/auth/logout", {});
});

export const createAuthSession = createAsyncThunk<
  CreateSessionResponse,
  { phoneMasked: string; deviceId?: string },
  { rejectValue: CreateSessionReject }
>("auth/createSession", async ({ phoneMasked, deviceId }, { rejectWithValue }) => {
  try {
    const phone = normalizeKzPhone(phoneMasked);
    const data = await apiPost<CreateSessionResponse>("/api/auth/session", { phone, deviceId });
    return data;
  } catch (e: any) {
    if (e instanceof ApiError) {
      return rejectWithValue(e.payload as CreateSessionReject);
    }
    return rejectWithValue({ status: "error", message: e?.message || "server_error" });
  }
});

export type CreateSessionResponse = {
  status: "ok";
  sessionId?: number | string | null;
  user: { id: number; documentId: string; phone: string; role: string; name?: string; surname?: string };
};

export type CreateSessionReject = {
  status: "error";
  message: string; // otp_not_confirmed | name_surname_required | customer_not_found | server_error
};