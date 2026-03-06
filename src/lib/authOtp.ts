import crypto from "crypto";

export function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("7")
      ? `+${digits}`
      : digits.length === 10
        ? `+7${digits}`
        : `+${digits}`;
  return normalized;
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