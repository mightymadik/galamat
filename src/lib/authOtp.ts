import crypto from "crypto";

/** Как в backend normalizePhoneForStorage: всегда «+» и цифры; 8XXXXXXXXXXX → +7XXXXXXXXXX */
export function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  const core =
    digits.length === 11 && digits.startsWith("8")
      ? `7${digits.slice(1)}`
      : digits;
  if (core.length === 10) return `+7${core}`;
  return `+${core}`;
}

export function isValidKzPhoneE164(phone: string) {
  return /^\+7\d{10}$/.test(phone);
}

export function rand4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function hashOtp(code: string) {
  const salt = process.env.OTP_SALT || "otp_salt_change_me";
  return crypto.createHash("sha256").update(`${code}:${salt}`).digest("hex");
}