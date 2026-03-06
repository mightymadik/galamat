// store/authThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiPost } from "@/lib/authApi";
import { normalizeKzPhone } from "@/utils/phone";

export type VerifyCodeOk = {
  status: "ok";
  sessionId?: number | null;
  user: { id: number; phone: string; role: string };
};

export type VerifyCodeErr = {
  status: "error";
  message: string; // invalid_code | too_many_attempts | code_expired_or_not_found ...
  meta?: { attemptsLeft?: number };
};

export const verifyAuthCode = createAsyncThunk<
  VerifyCodeOk,
  { phoneMasked: string; code: string; deviceId?: string },
  { rejectValue: VerifyCodeErr }
>("auth/verifyCode", async ({ phoneMasked, code, deviceId }, { rejectWithValue }) => {
  try {
    const phone = normalizeKzPhone(phoneMasked);
    const data = await apiPost<VerifyCodeOk>("/api/auth/verify-code", { phone, code, deviceId });
    return data;
  } catch (e: any) {
    // apiPost кидает Error(message). Нам нужно достать тело ошибки.
    // Поэтому лучше слегка обновить apiPost (ниже). Но если пока не хочешь —
    // вернём общий текст.
    return rejectWithValue({
      status: "error",
      message: e?.message || "server_error",
    });
  }
});