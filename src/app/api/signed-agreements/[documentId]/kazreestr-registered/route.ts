import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

const REGISTRABLE_TEMPLATE_TYPES = new Set(["ДДУ", "Дополнительное соглашение"]);

/**
 * Пересчитать kazreestrStatus у сделки исходя из флагов sendToKazreestr у её договоров.
 * Правила:
 *  - baseContractType === "ПДБ" → "Не применимо";
 *  - нет договоров с templateType ∈ {ДДУ, Дополнительное соглашение} → "Не применимо";
 *  - все такие договоры имеют sendToKazreestr === true → "Зарегистрировано";
 *  - иначе → "Не отправлено".
 */
async function recalcDealKazreestrStatus(
  base: string,
  headers: Record<string, string>,
  dealDocumentId: string
): Promise<string | null> {
  try {
    const dealRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?fields[0]=baseContractType&fields[1]=kazreestrStatus`,
      { headers }
    );
    const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
    const baseContractType = String(deal?.baseContractType ?? deal?.attributes?.baseContractType ?? "").trim();

    if (baseContractType === "ПДБ") {
      await strapiAxios.put(
        `${base}/api/deals/${encodeURIComponent(dealDocumentId)}`,
        { data: { kazreestrStatus: "Не применимо" } },
        { headers }
      );
      return "Не применимо";
    }

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}` +
        `&pagination[pageSize]=100&fields[0]=templateType&fields[1]=sendToKazreestr`,
      { headers }
    );
    const saList: any[] = (saRes.data as any)?.data ?? [];
    const registrable = saList.filter((row) => {
      const tt = String(row?.templateType ?? row?.attributes?.templateType ?? "").trim();
      return REGISTRABLE_TEMPLATE_TYPES.has(tt);
    });

    let nextStatus: string;
    if (registrable.length === 0) {
      nextStatus = "Не применимо";
    } else if (registrable.every((row) => (row?.sendToKazreestr ?? row?.attributes?.sendToKazreestr) === true)) {
      nextStatus = "Зарегистрировано";
    } else {
      nextStatus = "Не отправлено";
    }

    await strapiAxios.put(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}`,
      { data: { kazreestrStatus: nextStatus } },
      { headers }
    );
    return nextStatus;
  } catch (err) {
    console.error("[signed-agreements/kazreestr-registered] recalc deal status failed", err);
    return null;
  }
}

/**
 * POST /api/signed-agreements/[documentId]/kazreestr-registered
 * Body: { sendToKazreestr: boolean }
 * Юрист/ROP/Admin помечает отдельный договор как зарегистрированный (true)
 * или как не зарегистрированный (false) в Казреестре. После этого
 * агрегированный kazreestrStatus сделки пересчитывается автоматически.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const raw = (body as { sendToKazreestr?: unknown })?.sendToKazreestr;
    if (typeof raw !== "boolean") {
      return NextResponse.json({ error: "sendToKazreestr must be boolean" }, { status: 400 });
    }

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const rootBase = base.replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, rootBase, headers);
    const roleLower = String(effectiveRole ?? "").toLowerCase();
    if (roleLower !== "lawyer" && roleLower !== "admin" && roleLower !== "rop") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements/${encodeURIComponent(documentId)}?populate[deal][fields][0]=documentId&fields[0]=templateType&fields[1]=sendToKazreestr`,
      { headers }
    );
    const sa: any = (saRes.data as any)?.data ?? saRes.data;
    if (!sa) return NextResponse.json({ error: "Договор не найден" }, { status: 404 });

    const dealRel = sa?.deal ?? sa?.attributes?.deal;
    const dealNode = (dealRel as any)?.data ?? dealRel;
    const dealDocumentId: string | null = dealNode?.documentId ?? dealNode?.attributes?.documentId ?? null;

    await strapiAxios.put(
      `${base}/api/signed-agreements/${encodeURIComponent(documentId)}`,
      { data: { sendToKazreestr: raw } },
      { headers }
    );

    let dealKazreestrStatus: string | null = null;
    if (dealDocumentId) {
      dealKazreestrStatus = await recalcDealKazreestrStatus(base, headers, dealDocumentId);
    }

    return NextResponse.json({ ok: true, sendToKazreestr: raw, dealKazreestrStatus });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? "server_error";
    console.error("[signed-agreements/kazreestr-registered]", status, msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
