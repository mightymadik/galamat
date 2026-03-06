import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import {
  getDoodocsToken,
  getOrCreateTeamspace,
  uploadDocument,
  createWorkflowAndLaunch,
  getDocumentShareLink,
  DOODOCS_LINK_BASE,
  sendWhatsApp,
  sanitizeDocumentName,
} from "@/lib/doodocs";

function formatIin(iin: string | number | null | undefined): string {
  if (iin == null) return "";
  const s = String(iin).replace(/\D/g, "");
  return s.length <= 12 ? s.padStart(12, "0") : s.slice(-12);
}

function formatBin(bin: string | number | null | undefined): string {
  if (bin == null) return "";
  const s = String(bin).replace(/\D/g, "");
  return s.length <= 12 ? s.padStart(12, "0") : s.slice(-12);
}

function toE164(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return "7" + digits.slice(-10);
  return digits ? digits : "";
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fileUrl, contractName, projectDocumentId, dealDocumentId } = body as {
      fileUrl?: string;
      contractName?: string;
      projectDocumentId?: string;
      dealDocumentId?: string;
    };

    if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("http"))
      return NextResponse.json(
        { status: "error", message: "fileUrl required and must be a direct document URL" },
        { status: 400 }
      );
    if (!projectDocumentId || typeof projectDocumentId !== "string")
      return NextResponse.json(
        { status: "error", message: "projectDocumentId required" },
        { status: 400 }
      );

    const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const customerRes = await strapiAxios.get(
      `${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1`,
      { headers }
    );
    const customerItem: any = (customerRes.data as any)?.data?.[0];
    if (!customerItem?.id)
      return NextResponse.json(
        { status: "error", message: "customer_not_found" },
        { status: 404 }
      );

    const attrs = customerItem?.attributes ?? customerItem;
    const email = (attrs.email ?? customerItem.email ?? "").trim() || undefined;
    const iin = formatIin(attrs.iin ?? customerItem.iin);
    const phone = toE164(attrs.phone ?? customerItem.phone);

    if (!iin || iin.length !== 12)
      return NextResponse.json(
        { status: "error", message: "customer_iin_invalid" },
        { status: 400 }
      );
    if (!email)
      return NextResponse.json(
        { status: "error", message: "customer_email_required" },
        { status: 400 }
      );

    const agreementsRes = await strapiAxios.get(
      `${base}/api/agreements?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}&pagination[pageSize]=1&populate[project][populate][developer]=true`,
      { headers }
    );
    const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
    if (!agreementItem)
      return NextResponse.json(
        { status: "error", message: "agreement_not_found" },
        { status: 404 }
      );

    const project =
      agreementItem?.project ??
      agreementItem?.attributes?.project?.data ??
      agreementItem?.attributes?.project;
    const developer =
      project?.developer ??
      project?.attributes?.developer?.data ??
      project?.attributes?.developer;
    const developerName =
      (developer?.name ?? developer?.attributes?.name ?? "Застройщик").trim() || "Застройщик";
    const companyBin = formatBin(developer?.bin ?? developer?.attributes?.bin);
    if (!companyBin || companyBin.length !== 12)
      return NextResponse.json(
        { status: "error", message: "developer_bin_invalid" },
        { status: 400 }
      );

    const pdfRes = await fetch(fileUrl);
    if (!pdfRes.ok)
      return NextResponse.json(
        { status: "error", message: "document_download_failed" },
        { status: 502 }
      );
    const fileBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const contentType = pdfRes.headers.get("content-type") || "application/pdf";
    const isDocx =
      contentType.includes("wordprocessingml") || /\.docx$/i.test(fileUrl);
    const docName = sanitizeDocumentName(contractName, isDocx);

    const bearerToken = await getDoodocsToken();
    const teamspaceId = await getOrCreateTeamspace(bearerToken, developerName);
    const documentId = await uploadDocument(
      bearerToken,
      fileBuffer,
      docName,
      teamspaceId,
      isDocx
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : contentType
    );

    await createWorkflowAndLaunch(
      bearerToken,
      documentId,
      email,
      iin,
      process.env.DOODOCS_COMPANY_EMAIL ?? "galamat.company@gmail.com",
      companyBin
    );

    const shareLink = await getDocumentShareLink(bearerToken, documentId);
    const signUrl = `${DOODOCS_LINK_BASE}/${shareLink}`;

    if (phone) {
      const msg = `Здравствуйте! Ссылка для подписания договора: ${signUrl}`;
      await sendWhatsApp(phone, msg, { templateLink: signUrl, templateName: "document2" });
    }

    // После успешной отправки на подписание — сделка «Ожидания договора», сохраняем doodocsDocumentId для проверки статуса после перезагрузки.
    if (dealDocumentId && typeof dealDocumentId === "string") {
      try {
        await strapiAxios.put(
          `${base}/api/deals/${dealDocumentId}`,
          {
            data: {
              dealStatus: "Ожидания договора",
              ...(documentId && { doodocsDocumentId: documentId }),
            },
          },
          { headers }
        );
      } catch (e: any) {
        console.warn("signing/start: deal status update failed", e?.response?.status, e?.message);
      }
    }

    return NextResponse.json({
      status: "ok",
      documentId,
      signUrl,
    });
  } catch (e: any) {
    console.error("signing/start error:", e);
    return NextResponse.json(
      { status: "error", message: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
