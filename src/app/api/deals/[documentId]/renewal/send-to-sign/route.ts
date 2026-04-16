import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { managerForbiddenForDeal, resolveEffectiveRole } from "@/lib/dealManagerAuth";
import { agreementTypeFromDeal } from "@/lib/agreementSettingStrapi";
import { getDocumentShareLink, DOODOCS_LINK_BASE } from "@/lib/doodocs";
import { absoluteAppUrlFromRequest } from "@/lib/uploadsProxyUrl";

const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(/\/$/, "");
const DOODOCS_CLIENT_ID = process.env.DOODOCS_CLIENT_ID;
const DOODOCS_CLIENT_SECRET = process.env.DOODOCS_CLIENT_SECRET;
const DOODOCS_WORKSPACE_ID = process.env.DOODOCS_WORKSPACE_ID;
const DOODOCS_COMPANY_EMAIL = process.env.DOODOCS_COMPANY_EMAIL ?? "info@galahub.kz";

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

function sanitizeDocumentName(contractName: string | undefined, isDocx: boolean): string {
  const raw = (contractName ?? "Переоформление").trim();
  const allowed = raw.replace(/[^\p{L}\p{N}\s\-]/gu, " ").replace(/\s+/g, " ").trim();
  const base = allowed.slice(0, 150) || "document";
  return isDocx ? `${base}.docx` : `${base}.pdf`;
}

async function getDoodocsToken(): Promise<string> {
  if (!DOODOCS_CLIENT_ID || !DOODOCS_CLIENT_SECRET)
    throw new Error("DOODOCS_CLIENT_ID and DOODOCS_CLIENT_SECRET required");
  const basic = Buffer.from(`${DOODOCS_CLIENT_ID}:${DOODOCS_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${DOODOCS_API_URL}/api/v1/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`DOODOCS token failed: ${res.status} ${await res.text()}`);
  const data = await res.json().catch(() => ({}));
  const token = data?.access_token;
  if (!token) throw new Error("DOODOCS token missing in response");
  return token;
}

async function getOrCreateTeamspace(bearerToken: string, developerName: string): Promise<string> {
  if (!DOODOCS_WORKSPACE_ID) throw new Error("DOODOCS_WORKSPACE_ID required");
  const listUrl = `${DOODOCS_API_URL}/api/v1/workspaces/${DOODOCS_WORKSPACE_ID}/teamspaces`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!listRes.ok)
    throw new Error(`DOODOCS list teamspaces failed: ${listRes.status} ${await listRes.text()}`);
  const listData = (await listRes.json().catch(() => ({}))) as { teamspaces?: Array<{ id?: string; name?: string }> };
  const teamspaces = listData?.teamspaces ?? [];
  const normalizedSearch = (developerName || "Застройщик").trim().toLowerCase();
  const found = teamspaces.find((t) => (t?.name ?? "").trim().toLowerCase() === normalizedSearch);
  if (found?.id) return String(found.id);

  const createRes = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      teamspace: { name: (developerName || "Застройщик").trim(), attrs: {} },
    }),
  });
  if (!createRes.ok)
    throw new Error(`DOODOCS create teamspace failed: ${createRes.status} ${await createRes.text()}`);
  const createData = await createRes.json().catch(() => ({}));
  const teamspaceId = createData?.teamspace_id ?? createData?.id;
  if (!teamspaceId) throw new Error("DOODOCS teamspace_id missing in create response");
  return String(teamspaceId);
}

async function uploadDocument(
  bearerToken: string,
  fileBuffer: Buffer,
  documentName: string,
  teamspaceId: string,
  contentType: string
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType });
  form.append("file", blob, documentName);
  form.append("document_name", documentName);
  form.append("teamspace_id", teamspaceId);

  const res = await fetch(`${DOODOCS_API_URL}/api/v1/documents/pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`DOODOCS upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json().catch(() => ({}));
  const documentId = data?.document_id ?? data?.id;
  if (!documentId) throw new Error("DOODOCS document_id missing in upload response");
  return String(documentId);
}

/** Create 3-step workflow: 1=previous client, 2=current client, 3=company. */
async function createRenewalWorkflowAndLaunch(
  bearerToken: string,
  documentId: string,
  previousClientEmail: string,
  previousClientIin: string,
  currentClientEmail: string,
  currentClientIin: string,
  companyEmail: string,
  companyBin: string
): Promise<void> {
  const workflowRes = await fetch(
    `${DOODOCS_API_URL}/api/v1/documents/${documentId}/workflow/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        workflow: {
          steps: [
            {
              index: 1,
              type: "signer_rk",
              recipients: [
                {
                  actor_id: 0,
                  role: "signer_rk",
                  attrs: {
                    email: previousClientEmail,
                    filter: [{ iin: previousClientIin }],
                  },
                },
              ],
            },
            {
              index: 2,
              type: "signer_rk",
              recipients: [
                {
                  actor_id: 1,
                  role: "signer_rk",
                  attrs: {
                    email: currentClientEmail,
                    filter: [{ iin: currentClientIin }],
                  },
                },
              ],
            },
            {
              index: 3,
              type: "signer_rk",
              recipients: [
                {
                  actor_id: 2,
                  role: "signer_rk",
                  attrs: {
                    email: DOODOCS_COMPANY_EMAIL,
                    filter: [{ bin: companyBin, role: "employee-can-sign" }],
                  },
                },
              ],
            },
          ],
        },
      }),
    }
  );
  if (!workflowRes.ok) {
    const text = await workflowRes.text();
    if (workflowRes.status === 403 && /email not allowed|sign request via email/i.test(text)) {
      const err = new Error("DOODOCS: sign request via email not allowed") as Error & { code?: string };
      err.code = "doodocs_email_not_allowed";
      throw err;
    }
    throw new Error(`DOODOCS workflow failed: ${workflowRes.status} ${text}`);
  }

  const launchRes = await fetch(
    `${DOODOCS_API_URL}/api/v1/documents/${documentId}/workflow/launch`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${bearerToken}` },
      body: undefined,
    }
  );
  if (!launchRes.ok) {
    const text = await launchRes.text();
    throw new Error(`DOODOCS launch failed: ${launchRes.status} ${text}`);
  }
}

/**
 * POST /api/deals/[documentId]/renewal/send-to-sign
 * Body: {
 *   fileUrl: string,
 *   projectDocumentId: string,
 *   previousClientEmail: string,
 *   previousClientIin: string,
 *   currentClientEmail: string,
 *   currentClientIin: string
 * }
 * Returns: { documentId, signUrl }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  if (!DOODOCS_CLIENT_ID || !DOODOCS_CLIENT_SECRET)
    return NextResponse.json({ error: "doodocs_not_configured" }, { status: 503 });

  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { documentId: dealDocumentId } = await params;
  if (!dealDocumentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const {
    fileUrl,
    projectDocumentId,
    previousClientEmail,
    previousClientIin,
    currentClientEmail,
    currentClientIin,
    contractName,
  } = body as {
    fileUrl?: string;
    projectDocumentId?: string;
    previousClientEmail?: string;
    previousClientIin?: string;
    currentClientEmail?: string;
    currentClientIin?: string;
    contractName?: string;
  };

  if (!fileUrl || typeof fileUrl !== "string")
    return NextResponse.json({ error: "fileUrl required" }, { status: 400 });
  const fileUrlAbsolute = absoluteAppUrlFromRequest(req, fileUrl);
  if (!fileUrlAbsolute.startsWith("http"))
    return NextResponse.json({ error: "fileUrl invalid" }, { status: 400 });
  if (!projectDocumentId || typeof projectDocumentId !== "string")
    return NextResponse.json({ error: "projectDocumentId required" }, { status: 400 });
  if (!previousClientEmail?.trim() || !previousClientIin)
    return NextResponse.json({ error: "previousClientEmail and previousClientIin required" }, { status: 400 });
  if (!currentClientEmail?.trim() || !currentClientIin)
    return NextResponse.json({ error: "currentClientEmail and currentClientIin required" }, { status: 400 });

  const prevIin = formatIin(previousClientIin);
  const currIin = formatIin(currentClientIin);
  if (prevIin.length !== 12) return NextResponse.json({ error: "previousClientIin must be 12 digits" }, { status: 400 });
  if (currIin.length !== 12) return NextResponse.json({ error: "currentClientIin must be 12 digits" }, { status: 400 });

  try {
    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();

    const effectiveRole = await resolveEffectiveRole(payload, base, headers);
    if (effectiveRole !== "manager" && effectiveRole !== "admin" && effectiveRole !== "rop") {
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

    const dealTypeRes = await strapiAxios.get(
      `${base}/api/deals/${encodeURIComponent(dealDocumentId)}` +
        `?populate[property]=true&populate[commerce]=true&populate[parking]=true&populate[pantry]=true`,
      { headers }
    );
    const dealForType: any = (dealTypeRes.data as any)?.data ?? dealTypeRes.data;
    const agreementType = agreementTypeFromDeal(dealForType);

    const agreementsRes = await strapiAxios.get(
      `${base}/api/agreement-settings` +
        `?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}` +
        `&filters[agreementType][$eq]=${encodeURIComponent(agreementType)}` +
        `&pagination[pageSize]=1&populate[project][populate][developer]=true`,
      { headers }
    );
    const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
    if (!agreementItem)
      return NextResponse.json({ error: "agreement_not_found" }, { status: 404 });

    const project = agreementItem?.project ?? agreementItem?.attributes?.project?.data ?? agreementItem?.attributes?.project;
    const developer = project?.developer ?? project?.attributes?.developer?.data ?? project?.attributes?.developer;
    const developerName = (developer?.name ?? developer?.attributes?.name ?? "Застройщик").trim() || "Застройщик";
    const companyBin = formatBin(developer?.bin ?? developer?.attributes?.bin);
    if (!companyBin || companyBin.length !== 12)
      return NextResponse.json({ error: "developer_bin_invalid" }, { status: 400 });

    const pdfRes = await fetch(fileUrlAbsolute, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (!pdfRes.ok)
      return NextResponse.json({ error: "document_download_failed" }, { status: 502 });
    const fileBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const contentType = pdfRes.headers.get("content-type") || "application/pdf";
    const isDocx =
      contentType.includes("wordprocessingml") || /\.docx$/i.test(fileUrlAbsolute);
    const docName = sanitizeDocumentName(contractName, isDocx);

    const bearerToken = await getDoodocsToken();
    const teamspaceId = await getOrCreateTeamspace(bearerToken, developerName);
    const documentId = await uploadDocument(
      bearerToken,
      fileBuffer,
      docName,
      teamspaceId,
      isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : contentType
    );

    await createRenewalWorkflowAndLaunch(
      bearerToken,
      documentId,
      previousClientEmail.trim(),
      prevIin,
      currentClientEmail.trim(),
      currIin,
      DOODOCS_COMPANY_EMAIL,
      companyBin
    );

    const shareLink = await getDocumentShareLink(bearerToken, documentId);
    const signUrl = `${DOODOCS_LINK_BASE}/${shareLink}`;

    return NextResponse.json({
      status: "ok",
      documentId,
      signUrl,
    });
  } catch (e: any) {
    console.error("[deals/renewal/send-to-sign]", e);
    const msg = e?.message ?? "server_error";
    if (e?.code === "doodocs_email_not_allowed" || /sign request via email not allowed/i.test(String(msg))) {
      return NextResponse.json(
        {
          error: "Подписание по email отключено в настройках Doodocs. Включите опцию в личном кабинете Doodocs или обратитесь в поддержку.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
