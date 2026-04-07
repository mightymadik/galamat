import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { getDoodocsToken } from "@/lib/doodocs";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";
import {
  agreementTypeFromDeal,
  projectDocumentIdFromDeal,
  selectedRealEstateEntity,
} from "@/lib/agreementSettingStrapi";
import {
  dealDocumentIdFromSignedAgreementRecord,
  managerForbiddenForDeal,
  resolveEffectiveRole,
  templateTypeFromSignedAgreementRecord,
} from "@/lib/dealManagerAuth";

const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(/\/$/, "");

/**
 * POST /api/deals/[documentId]/renewal/check-status
 * Body: { doodocsDocumentId: string, signedAgreementDocumentId: string }
 * Checks DOODOCS document status; if signed, updates the signed-agreement (signed, signedAt).
 * Does NOT reassign deal — frontend calls renewal/complete for that.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId: dealDocumentId } = await params;
    if (!dealDocumentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { doodocsDocumentId, signedAgreementDocumentId } = body as {
      doodocsDocumentId?: string;
      signedAgreementDocumentId?: string;
    };
    if (!doodocsDocumentId)
      return NextResponse.json({ error: "doodocsDocumentId required" }, { status: 400 });
    if (!signedAgreementDocumentId || typeof signedAgreementDocumentId !== "string") {
      return NextResponse.json({ error: "signedAgreementDocumentId required" }, { status: 400 });
    }

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const effectiveRole = await resolveEffectiveRole(payload, base, headers);
    if (effectiveRole !== "manager" && effectiveRole !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const dealAuthRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}?populate[manager][fields][0]=id`,
      { headers }
    );
    const dealForAuth: any = (dealAuthRes.data as any)?.data ?? dealAuthRes.data;
    if (!dealForAuth) return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    if (managerForbiddenForDeal(effectiveRole, payload.sub, dealForAuth)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const saRes = await strapiAxios.get(
      `${base}/api/signed-agreements/${encodeURIComponent(signedAgreementDocumentId)}?populate[deal]=true`,
      { headers }
    );
    const saRow: any = (saRes.data as any)?.data ?? saRes.data;
    if (!saRow) return NextResponse.json({ error: "signed_agreement_not_found" }, { status: 404 });

    const saDealId = dealDocumentIdFromSignedAgreementRecord(saRow);
    if (saDealId !== dealDocumentId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (templateTypeFromSignedAgreementRecord(saRow) !== "Переоформление") {
      return NextResponse.json({ error: "invalid_signed_agreement_type" }, { status: 400 });
    }

    const existingDoodocs = String(
      saRow?.doodocsDocumentId ?? saRow?.attributes?.doodocsDocumentId ?? ""
    ).trim();
    if (existingDoodocs && existingDoodocs !== doodocsDocumentId) {
      return NextResponse.json({ error: "doodocs_mismatch" }, { status: 400 });
    }

    const token = await getDoodocsToken();
    const res = await fetch(
      `${DOODOCS_API_URL}/api/v1/documents/${doodocsDocumentId}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "doodocs_failed", detail: text, signed: false },
        { status: 502 }
      );
    }
    const data = (await res.json().catch(() => ({}))) as { document?: { status?: string; link_ddcard?: string } };
    const status = data?.document?.status ?? "";
    const signed = status === "signed" || status === "completed";

    if (!signed) {
      return NextResponse.json({ signed: false, status });
    }

    const now = new Date().toISOString();

    let agreementNumberForPdf = "";
    try {
      const dealRes = await strapiAxios.get(
        `${base}/api/deals/${dealDocumentId}?` +
          `populate[property][populate][project]=true&` +
          `populate[commerce][populate][project]=true&` +
          `populate[parking][populate][project]=true&` +
          `populate[pantry][populate][project]=true`,
        { headers }
      );
      const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
      const projectDocumentId = projectDocumentIdFromDeal(deal);
      const agreementType = agreementTypeFromDeal(deal);
      if (projectDocumentId) {
        const agreementsRes = await strapiAxios.get(
          `${base}/api/agreement-settings?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}` +
            `&filters[agreementType][$eq]=${encodeURIComponent(agreementType)}` +
            `&pagination[pageSize]=1&fields[0]=agreementCode`,
          { headers }
        );
        const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
        const agreementCode = agreementItem?.agreementCode ?? agreementItem?.attributes?.agreementCode ?? "";
        const re = selectedRealEstateEntity(deal);
        const house = re?.house ?? re?.attributes?.house ?? "";
        const apartmentNumber =
          re?.apartmentNumber ??
          re?.commerceNumber ??
          re?.parkingNumber ??
          re?.numberPantry ??
          re?.attributes?.apartmentNumber ??
          re?.attributes?.commerceNumber ??
          re?.attributes?.parkingNumber ??
          re?.attributes?.numberPantry ??
          "";
        const entrance = re?.entrance ?? re?.attributes?.entrance ?? "";
        agreementNumberForPdf = buildAgreementNumber(agreementCode, house, apartmentNumber, entrance);
      }
    } catch {
      // keep empty, fallback to uuid filename
    }

    let signedAgreementFileId: number | null = null;
    try {
      const ezsignerRes = await fetch(
        `${DOODOCS_API_URL}/api/v1/documents/${encodeURIComponent(doodocsDocumentId)}/ezsigner`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } }
      );
      if (ezsignerRes.ok) {
        const ezsignerBuffer = Buffer.from(await ezsignerRes.arrayBuffer());
        const FormData = (await import("form-data")).default;
        const form = new FormData();
        const pdfFilename = agreementNumberForPdf
          ? `Переоформление ${agreementNumberForFilename(agreementNumberForPdf)} (ezsigner).pdf`
          : `signed-renewal-${doodocsDocumentId} (ezsigner).pdf`;
        form.append("files", ezsignerBuffer, {
          filename: pdfFilename,
          contentType: "application/pdf",
        });
        const uploadRes = await strapiAxios.post(`${base}/api/upload`, form, {
          headers: { ...headers, ...form.getHeaders() },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });
        const uploadData = (uploadRes.data as any) ?? [];
        const firstFile = Array.isArray(uploadData) ? uploadData[0] : uploadData;
        if (firstFile?.id) signedAgreementFileId = firstFile.id;
      }
    } catch (uploadErr: any) {
      console.warn("[deals/renewal/check-status] upload ezsigner failed:", uploadErr?.message);
    }

    const targetSignedAgreementDocumentId = signedAgreementDocumentId;

    const saData: Record<string, unknown> = { signed: true, signedAt: now, doodocsDocumentId };
    if (signedAgreementFileId != null) saData.signedAgreement = signedAgreementFileId;
    await strapiAxios.put(
      `${base}/api/signed-agreements/${targetSignedAgreementDocumentId}`,
      { data: saData },
      { headers }
    );

    // Казреестр для переоформления временно отключён (API у контрагента ещё не готов).
    // try {
    //   await strapiAxios.post(
    //     `${base}/api/deals/${encodeURIComponent(dealDocumentId)}/kazreestr/register`,
    //     { operation: "renewal" },
    //     { headers, timeout: 120_000 }
    //   );
    // } catch (kzErr: any) {
    //   console.warn(
    //     "[deals/renewal/check-status] kazreestr register:",
    //     kzErr?.response?.data ?? kzErr?.message
    //   );
    // }

    return NextResponse.json({ signed: true, signedAt: now, status });
  } catch (e: any) {
    console.error("[deals/renewal/check-status]", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error", signed: false },
      { status: 500 }
    );
  }
}
