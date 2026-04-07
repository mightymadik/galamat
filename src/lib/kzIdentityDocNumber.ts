/** УЛ в Strapi как число — в шаблонах подставляем 9 цифр с ведущими нулями. */
export function formatKzIdentityDocNumberForTemplates(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 9) return digits.slice(-9);
  return digits.padStart(9, "0");
}
