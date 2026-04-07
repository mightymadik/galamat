import { strapiAxios } from "@/lib/strapiServer";

export type AccessPayload = { sub: number; role?: string };

/** Роль из JWT или из записи customer в Strapi (как в остальных deal API routes). */
export async function resolveEffectiveRole(
  payload: AccessPayload,
  base: string,
  headers: Record<string, string>
): Promise<string> {
  let effectiveRole: string = payload.role ?? "customer";
  if (effectiveRole !== "manager" && effectiveRole !== "admin" && effectiveRole !== "rop") {
    const customerRes = await strapiAxios
      .get(
        `${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`,
        { headers }
      )
      .catch(() => null);
    const customer: any = (customerRes?.data as any)?.data?.[0];
    effectiveRole = customer?.role ?? customer?.attributes?.role ?? effectiveRole;
  }
  return effectiveRole;
}

/** true, если manager не имеет права на эту сделку. */
export function managerForbiddenForDeal(
  effectiveRole: string,
  payloadSub: number,
  deal: any
): boolean {
  if (effectiveRole !== "manager") return false;
  const managerId =
    deal?.manager?.id ?? deal?.attributes?.manager?.id ?? (deal?.manager as any)?.data?.id;
  if (managerId == null) return false;
  return Number(managerId) !== Number(payloadSub);
}

export function dealDocumentIdFromSignedAgreementRecord(sa: any): string | null {
  if (!sa || typeof sa !== "object") return null;
  const deal = sa.deal ?? sa.attributes?.deal;
  const d = deal?.data ?? deal;
  const docId = d?.documentId ?? d?.attributes?.documentId;
  return docId && typeof docId === "string" ? docId : null;
}

export function templateTypeFromSignedAgreementRecord(sa: any): string {
  return String(sa?.templateType ?? sa?.attributes?.templateType ?? "").trim();
}

/** Есть ли у сделки подписанный договор нужного типа (ДДУ на сделке не подойдёт). */
export async function dealHasSignedAgreementOfTemplate(
  base: string,
  headers: Record<string, string>,
  dealDocumentId: string,
  templateType: "Переоформление" | "Расторжение"
): Promise<boolean> {
  const res = await strapiAxios.get(
    `${base}/api/signed-agreements?` +
      `filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}&` +
      `filters[templateType][$eq]=${encodeURIComponent(templateType)}&` +
      `filters[signed][$eq]=true&pagination[pageSize]=1`,
    { headers }
  );
  return Boolean((res.data as any)?.data?.[0]);
}
