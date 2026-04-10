/**
 * Разбор тел ошибок queue API (Next.js прокси и queue-backend).
 * Бэкенд (AppError) отдаёт { success: false, error: "текст" };
 * часть маршрутов Next добавляет { message: "..." } рядом с error-кодом.
 */

const OPAQUE_ERROR_CODES = new Set([
  "queue_error",
  "queue_unavailable",
  "unauthorized",
  "invalid_body",
  "invalid_status",
  "manager_id_required",
  "managerid_required",
  "counter_id_required",
  "counterid_required",
  "queue_no_branch",
  "queue_call_error",
  "forbidden",
  "shift_closed",
]);

function isScreamingSnakeCode(s: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/.test(s);
}

/** Текст для пользователя из тела ответа (message приоритетнее error). */
export function extractQueueApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  const msg = o.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  const err = o.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  return undefined;
}

/**
 * Показываем текст с бэка, если он похож на человекочитаемый;
 * иначе — запасной перевод (opaque-коды, SCREAMING_SNAKE без текста).
 */
export function userFacingQueueError(raw: string | undefined, fallback: string): string {
  const text = raw?.trim();
  if (!text) return fallback;
  if (/[\s\u0400-\u04FF]/.test(text)) return text;
  if (text.length >= 48) return text;
  const lower = text.toLowerCase();
  if (OPAQUE_ERROR_CODES.has(lower)) return fallback;
  if (isScreamingSnakeCode(text)) return fallback;
  return text;
}
