export function normalizeKzPhone(masked: string): string {
    // "+7 (777) 123-45-67" -> "+77771234567"
    const digits = (masked || "").replace(/\D/g, "");
    // digits: "77771234567" (если маска +7)
    if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
    // если вдруг пришло без 7 (редко)
    if (digits.length === 10) return `+7${digits}`;
    return `+${digits}`;
  }
  