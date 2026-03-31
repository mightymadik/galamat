type TFn = (key: string, values?: any) => string;

export function mapSendCodeErrorMessage(message: unknown, t: TFn): string {
  const code = String(message || "");
  switch (code) {
    case "invalid_phone":
      return t("wrong_phone");
    case "otp_send_limit_reached":
      return t("otp_send_limit_reached");
    case "otp_resend_cooldown":
      return t("too_many_requests");
    case "too_many_requests":
      return t("too_many_requests");
    case "send_code_failed":
      return t("error_sending_code");
    default:
      return t("error_sending_code");
  }
}
