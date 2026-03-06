/**
 * Формат номера договора: {Сокращение дома}{номер дома}-{номер квартиры}/{номер подъезда}
 * Пример: GS2-115/9
 */
export function buildAgreementNumber(
  agreementCode: string | null | undefined,
  house: string | number | null | undefined,
  apartmentNumber: string | number | null | undefined,
  entrance: string | number | null | undefined
): string {
  const code = agreementCode != null && String(agreementCode).trim() !== "" ? String(agreementCode).trim() : "";
  const h = house != null && String(house).trim() !== "" ? String(house).trim() : "";
  const buildingPart = (code + h).trim() || "";
  const apt = apartmentNumber != null && String(apartmentNumber).trim() !== "" ? String(apartmentNumber).trim() : "";
  const ent = entrance != null && String(entrance).trim() !== "" ? String(entrance).trim() : "";
  const main = [buildingPart, apt].filter(Boolean).join("-");
  return main + (ent ? `/${ent}` : "");
}

/** Для имён файлов: слеш заменяем на дефис (GS2-115-9) */
export function agreementNumberForFilename(agreementNumber: string): string {
  return agreementNumber.replace(/\//g, "-");
}