import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { getDoodocsToken } from "@/lib/doodocs";
import { buildAgreementNumber, agreementNumberForFilename } from "@/lib/agreementNumber";

const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(/\/$/, "");

/**
 * POST /api/deals/[documentId]/termination/check-status
 * Body: { doodocsDocumentId: string, signedAgreementDocumentId?: string }
 * Checks DOODOCS document status; if signed, updates the signed-agreement (signed, signedAt).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    verifyAccessToken(access);

    const { documentId: dealDocumentId } = await params;
    if (!dealDocumentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { doodocsDocumentId, signedAgreementDocumentId } = body as {
      doodocsDocumentId?: string;
      signedAgreementDocumentId?: string;
    };
    if (!doodocsDocumentId)
      return NextResponse.json({ error: "doodocsDocumentId required" }, { status: 400 });

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

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const now = new Date().toISOString();

    let agreementNumberForPdf = "";
    try {
      const dealRes = await strapiAxios.get(
        `${base}/api/deals/${dealDocumentId}?populate[property][populate][project]=true`,
        { headers }
      );
      const deal: any = (dealRes.data as any)?.data ?? dealRes.data;
      const prop = deal?.property?.data ?? deal?.property ?? deal?.attributes?.property?.data ?? deal?.attributes?.property;
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
      // keep empty, fallback to uuid filename
    }

    let signedAgreementFileId: number | null = null;
    const linkDdcard = data?.document?.link_ddcard;
    if (linkDdcard && typeof linkDdcard === "string") {
      try {
        const fileRes = await fetch(linkDdcard);
        if (fileRes.ok) {
          const buf = Buffer.from(await fileRes.arrayBuffer());
          const FormData = (await import("form-data")).default;
          const form = new FormData();
          const pdfFilename = agreementNumberForPdf
            ? `Расторжение ${agreementNumberForFilename(agreementNumberForPdf)}.pdf`
            : `signed-termination-${doodocsDocumentId}.pdf`;
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
        console.warn("[deals/termination/check-status] upload link_ddcard failed:", uploadErr?.message);
      }
    }

    if (signedAgreementDocumentId) {
      const saData: Record<string, unknown> = { signed: true, signedAt: now };
      if (signedAgreementFileId != null) saData.signedAgreement = signedAgreementFileId;
      await strapiAxios.put(
        `${base}/api/signed-agreements/${signedAgreementDocumentId}`,
        { data: saData },
        { headers }
      );
    }

    return NextResponse.json({ signed: true, signedAt: now, status });
  } catch (e: any) {
    console.error("[deals/termination/check-status]", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error", signed: false },
      { status: 500 }
    );
  }
}
