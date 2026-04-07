/**
 * Strapi 5: настройки договоров — collection `agreement-settings`, не `agreements`.
 * Шаблоны лежат в flows[].templates[] (agreement-template), поля terminationTemplate/renewalTemplate на корне нет.
 */

export type AgreementTypeRu = "Квартиры" | "Коммерция" | "Паркинг" | "Кладовка";
export type BaseContractTypeRu = "ДДУ" | "ПДБ";

/** documentId проекта для связи с agreement-setting */
export function projectDocumentIdFromDeal(deal: any): string | null {
  const candidates = [
    deal?.property ?? deal?.attributes?.property,
    deal?.commerce ?? deal?.attributes?.commerce,
    deal?.parking ?? deal?.attributes?.parking,
    deal?.pantry ?? deal?.attributes?.pantry,
  ];
  for (const rel of candidates) {
    const entity = rel?.data ?? rel;
    if (!entity) continue;
    const project = entity?.project ?? entity?.attributes?.project?.data ?? entity?.attributes?.project;
    const p = project?.data ?? project;
    const id = p?.documentId ?? p?.id;
    if (id) return String(id);
  }
  return null;
}

/** Первый связанный объект недвижимости (квартира / коммерция / паркинг / кладовка). */
export function selectedRealEstateEntity(deal: any): any {
  const candidates = [
    deal?.property ?? deal?.attributes?.property,
    deal?.commerce ?? deal?.attributes?.commerce,
    deal?.parking ?? deal?.attributes?.parking,
    deal?.pantry ?? deal?.attributes?.pantry,
  ];
  for (const rel of candidates) {
    const entity = rel?.data ?? rel;
    if (entity && (entity.documentId || entity.id)) return entity;
  }
  return null;
}

export function agreementTypeFromDeal(deal: any): AgreementTypeRu {
  const has = (rel: any) => {
    const v = rel?.data ?? rel;
    return v && (v.documentId || v.id);
  };
  if (has(deal?.property ?? deal?.attributes?.property)) return "Квартиры";
  if (has(deal?.commerce ?? deal?.attributes?.commerce)) return "Коммерция";
  if (has(deal?.parking ?? deal?.attributes?.parking)) return "Паркинг";
  if (has(deal?.pantry ?? deal?.attributes?.pantry)) return "Кладовка";
  return "Квартиры";
}

/** Найти медиа шаблона docx по documentType сценария (Расторжение / Переоформление). */
export function findTemplateMediaByDocumentType(
  agreementItem: any,
  documentType: "Расторжение" | "Переоформление",
  preferredBaseContractType?: BaseContractTypeRu | null
): { url?: string; name?: string } | null {
  const legacyKey = documentType === "Расторжение" ? "terminationTemplate" : "renewalTemplate";
  const legacy = agreementItem?.[legacyKey] ?? agreementItem?.attributes?.[legacyKey];
  if (legacy) {
    const m = Array.isArray(legacy) ? legacy[0] : legacy;
    if (m?.url) return { url: m.url, name: m.name };
  }

  const flowsRaw =
    agreementItem?.flows ?? agreementItem?.attributes?.flows?.data ?? agreementItem?.attributes?.flows;
  const flows = Array.isArray(flowsRaw) ? flowsRaw : [];

  const normalizeBaseContractType = (raw: unknown): BaseContractTypeRu | null => {
    const s = String(raw ?? "").trim().toUpperCase();
    if (!s) return null;
    if (s === "ПДБ" || s === "PDB") return "ПДБ";
    if (s === "ДДУ" || s === "DDU") return "ДДУ";
    return null;
  };

  const detectBaseContractType = (entity: any): BaseContractTypeRu | null => {
    const data = entity?.data ?? entity;
    const attrs = data?.attributes ?? data;
    const directCandidates = [
      attrs?.baseContractType,
      attrs?.scenarioType,
      attrs?.contractType,
      attrs?.flowType,
      attrs?.type,
      attrs?.name,
      attrs?.title,
      attrs?.label,
    ];
    for (const value of directCandidates) {
      const normalized = normalizeBaseContractType(value);
      if (normalized) return normalized;
    }
    return null;
  };

  const pickTemplate = (strictBaseType: boolean): { url?: string; name?: string } | null => {
    for (const flow of flows) {
      const f = flow?.data ?? flow;
      const flowBaseType = detectBaseContractType(f);
      if (strictBaseType && preferredBaseContractType && flowBaseType !== preferredBaseContractType) continue;

      const templatesRaw = f?.templates ?? f?.attributes?.templates?.data ?? f?.attributes?.templates;
      const templates = Array.isArray(templatesRaw) ? templatesRaw : [];
      for (const tpl of templates) {
        const t = tpl?.data ?? tpl;
        const dt = t?.documentType ?? t?.attributes?.documentType;
        if (dt !== documentType) continue;
        const isActive = t?.isActive ?? t?.attributes?.isActive;
        if (isActive === false) continue;
        const tplBaseType = detectBaseContractType(t);
        if (strictBaseType && preferredBaseContractType && tplBaseType && tplBaseType !== preferredBaseContractType) continue;
        const media = t?.template ?? t?.attributes?.template;
        const m = Array.isArray(media) ? media[0] : media;
        if (m?.url) return { url: m.url, name: m.name };
      }
    }
    return null;
  };

  // If scenario base type is provided, try strict matching first.
  const strictMatch = preferredBaseContractType ? pickTemplate(true) : null;
  if (strictMatch) return strictMatch;

  // Backward-compatible fallback for legacy settings without scenario base type markers.
  return pickTemplate(false);
}
