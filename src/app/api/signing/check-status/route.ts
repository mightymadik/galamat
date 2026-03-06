import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { getDoodocsToken } from "@/lib/doodocs";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";

const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(/\/$/, "");

/**
 * POST /api/signing/check-status
 * Body: { documentId: string (DOODOCS), dealDocumentId: string }
 * Проверяет GET /documents/{documentId} в DOODOCS: если status signed/completed,
 * обновляет signed_agreement (signed, signedAt), deal и property как в sign-pdb.
 * В схеме signed-agreement нет поля для link_ddcard — только signed, signedAt.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    verifyAccessToken(access);

    const body = await req.json().catch(() => ({}));
    const { documentId, dealDocumentId } = body as { documentId?: string; dealDocumentId?: string };
    if (!documentId || !dealDocumentId) {
      return NextResponse.json(
        { error: "documentId and dealDocumentId required" },
        { status: 400 }
      );
    }

    const token = await getDoodocsToken();
    const res = await fetch(
      `${DOODOCS_API_URL}/api/v1/documents/${documentId}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "doodocs_failed", detail: text },
        { status: 502 }
      );
    }
    const data = (await res.json().catch(() => ({}))) as {
      document?: { status?: string; link_ddcard?: string };
    };
    const status = data?.document?.status ?? "";
    const signed = status === "signed" || status === "completed";
    if (!signed) {
      return NextResponse.json({ signed: false, status });
    }
    const linkDdcard = data?.document?.link_ddcard;

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const dealListRes = await strapiAxios.get(
      `${base}/api/deals?filters[documentId][$eq]=${encodeURIComponent(dealDocumentId)}&pagination[pageSize]=1&populate[property][populate][project]=true&populate[manager]=true`,
      { headers }
    );
    const dealList = (dealListRes.data as any)?.data ?? [];
    const deal = dealList[0];
    if (!deal) {
      return NextResponse.json({ error: "Сделка не найдена" }, { status: 404 });
    }
    const dealDocId = deal?.documentId ?? (deal as any)?.attributes?.documentId ?? dealDocumentId;

    const manager = deal?.manager ?? (deal as any)?.attributes?.manager;
    const managerDocId = manager?.documentId ?? (manager as any)?.id ?? null;

    let agreementNumberForPdf = "";
    try {
      const prop = deal?.property?.data ?? deal?.property ?? (deal as any)?.attributes?.property?.data ?? (deal as any)?.attributes?.property;
      const project = prop?.project?.data ?? prop?.project ?? prop?.attributes?.project?.data ?? prop?.attributes?.project;
      const projectDocumentId = project?.documentId ?? project?.id;
      if (projectDocumentId) {
        const agreementsRes = await strapiAxios.get(
          `${base}/api/agreements?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}&pagination[pageSize]=1&fields[0]=agreementCode`,
          { headers }
        );
        const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
        const agreementCode = agreementItem?.agreementCode ?? agreementItem?.attributes?.agreementCode ?? "";
        const house = prop?.house ?? prop?.attributes?.house ?? "";
        const apartmentNumber = prop?.apartmentNumber ?? prop?.attributes?.apartmentNumber ?? "";
        const entrance = prop?.entrance ?? prop?.attributes?.entrance ?? "";
        agreementNumberForPdf = buildAgreementNumber(agreementCode, house, apartmentNumber, entrance);
      }
    } catch {
      // keep empty
    }

    let signedAgreementFileId: number | null = null;
    if (linkDdcard && typeof linkDdcard === "string") {
      try {
        const fileRes = await fetch(linkDdcard);
        if (fileRes.ok) {
          const buf = Buffer.from(await fileRes.arrayBuffer());
          const FormData = (await import("form-data")).default;
          const form = new FormData();
          const pdfFilename = agreementNumberForPdf
            ? `Договор ${agreementNumberForFilename(agreementNumberForPdf)}.pdf`
            : `signed-${documentId}.pdf`;
          form.append("files", buf, {
            filename: pdfFilename,
            contentType: fileRes.headers.get("content-type") || "application/pdf",
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
        console.warn("[signing/check-status] upload link_ddcard failed:", uploadErr?.message);
      }
    }

    const saListRes = await strapiAxios.get(
      `${base}/api/signed-agreements?filters[deal][documentId][$eq]=${encodeURIComponent(dealDocumentId)}&sort[0]=createdAt:desc&pagination[pageSize]=1`,
      { headers }
    );
    const saList = (saListRes.data as any)?.data ?? [];
    const saItem = saList[0];
    const saDocId = saItem?.documentId ?? saItem?.id;

    const now = new Date().toISOString();
    if (saDocId) {
      const saData: Record<string, unknown> = { signed: true, signedAt: now };
      if (signedAgreementFileId != null) saData.signedAgreement = signedAgreementFileId;
      if (managerDocId) saData.manager = { connect: [managerDocId] };
      await strapiAxios.put(
        `${base}/api/signed-agreements/${saDocId}`,
        { data: saData },
        { headers }
      );
    }

    if (dealDocId) {
      await strapiAxios.put(
        `${base}/api/deals/${dealDocId}`,
        { data: { dealStatus: "Договор подписан" } },
        { headers }
      );
    }

    let property = deal?.property ?? (deal as any)?.attributes?.property;
    if (property && typeof property === "object" && "data" in property) {
      property = (property as { data?: { documentId?: string; id?: string } }).data;
    }
    let propertyDocId = property?.documentId ?? (property as any)?.id;
    if (!propertyDocId && dealDocId) {
      try {
        const oneDealRes = await strapiAxios.get(
          `${base}/api/deals/${dealDocId}?populate[property]=true`,
          { headers }
        );
        const oneDeal = (oneDealRes.data as any)?.data ?? oneDealRes.data;
        const prop = oneDeal?.property ?? (oneDeal as any)?.attributes?.property;
        const propData = prop?.data ?? prop;
        propertyDocId = propData?.documentId ?? (propData as any)?.id ?? prop?.documentId ?? (prop as any)?.id;
      } catch {
        // ignore
      }
    }
    if (propertyDocId) {
      try {
        await strapiAxios.put(
          `${base}/api/properties/${propertyDocId}`,
          { data: { propertyStatus: "договор" } },
          { headers }
        );
      } catch (propErr: any) {
        console.warn("[signing/check-status] property update failed:", propErr?.response?.status, propErr?.message);
      }
      try {
        await strapiAxios.post(`${base}/api/properties/${propertyDocId}/unpublish`, {}, { headers });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      signed: true,
      signedAt: now,
    });
  } catch (e: any) {
    console.error("signing/check-status error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
