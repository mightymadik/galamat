import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { sendWhatsApp, getDocumentShareLink, DOODOCS_LINK_BASE } from "@/lib/doodocs";

const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(/\/$/, "");
const DOODOCS_CLIENT_ID = process.env.DOODOCS_CLIENT_ID;
const DOODOCS_CLIENT_SECRET = process.env.DOODOCS_CLIENT_SECRET;
const DOODOCS_WORKSPACE_ID = process.env.DOODOCS_WORKSPACE_ID;
const DOODOCS_COMPANY_EMAIL = process.env.DOODOCS_COMPANY_EMAIL ?? "galamat.company@gmail.com";

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
  if (digits.length >= 10) {
    const rest = digits.slice(-10);
    return "7" + rest;
  }
  return digits ? digits : "";
}

/** Safe document name for DOODOCS: letters (Cyrillic/Latin), digits, spaces, hyphen; no leading/trailing junk. */
function sanitizeDocumentName(contractName: string | undefined, isDocx: boolean): string {
  const raw = (contractName ?? "Договор").trim();
  const allowed = raw.replace(/[^\p{L}\p{N}\s\-]/gu, " ").replace(/\s+/g, " ").trim();
  const base = allowed.slice(0, 150) || "document";
  return isDocx ? `${base}.docx` : `${base}.pdf`;
}

/** Get DOODOCS Bearer token (client_credentials). */
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DOODOCS token failed: ${res.status} ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  const token = data?.access_token;
  if (!token) throw new Error("DOODOCS token missing in response");
  return token;
}

/**
 * Get existing teamspace by developer name or create one if not found.
 * GET /workspaces/{workspace_id}/teamspaces → { teamspaces: [ { id, name, ... } ] }
 * Only creates when no teamspace with that name exists in the list.
 */
async function getOrCreateTeamspace(
  bearerToken: string,
  developerName: string
): Promise<string> {
  if (!DOODOCS_WORKSPACE_ID) throw new Error("DOODOCS_WORKSPACE_ID required");
  const listUrl = `${DOODOCS_API_URL}/api/v1/workspaces/${DOODOCS_WORKSPACE_ID}/teamspaces`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`DOODOCS list teamspaces failed: ${listRes.status} ${text}`);
  }
  const listData = (await listRes.json().catch(() => ({}))) as {
    teamspaces?: Array<{ id?: string; name?: string }>;
  };
  const teamspaces = listData?.teamspaces ?? [];
  const normalizedSearch = (developerName || "Застройщик").trim().toLowerCase();
  const found = teamspaces.find((t) => {
    const name = (t?.name ?? "").trim().toLowerCase();
    return name === normalizedSearch;
  });
  if (found?.id) return String(found.id);

  const createRes = await fetch(listUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      teamspace: {
        name: (developerName || "Застройщик").trim(),
        attrs: {},
      },
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`DOODOCS create teamspace failed: ${createRes.status} ${text}`);
  }
  const createData = await createRes.json().catch(() => ({}));
  const teamspaceId = createData?.teamspace_id ?? createData?.id;
  if (!teamspaceId) throw new Error("DOODOCS teamspace_id missing in create response");
  return String(teamspaceId);
}

/** Upload PDF/DOCX to DOODOCS and return document_id. */
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DOODOCS upload failed: ${res.status} ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  const documentId = data?.document_id ?? data?.id;
  if (!documentId) throw new Error("DOODOCS document_id missing in upload response");
  return String(documentId);
}

/** Create workflow (email) and launch. */
async function createWorkflowAndLaunch(
  bearerToken: string,
  documentId: string,
  clientEmail: string,
  clientIin: string,
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
                    email: clientEmail,
                    filter: [{ iin: clientIin }],
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
                    email: companyEmail,
                    filter: [
                      { bin: companyBin, role: "employee-can-sign" },
                    ],
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

const STEPS = {
  prepare: "Подготовка данных…",
  token: "Подключение к сервису онлайн подписание…",
  teamspace: "Поиск пространства застройщика…",
  upload: "Загрузка документа…",
  workflow: "Настройка подписания…",
  launch: "Запуск процесса подписания…",
  link: "Формирование ссылки для подписания…",
  whatsapp: "Отправка ссылки в WhatsApp…",
  done: "Готово",
} as const;

export async function POST(req: Request) {
  if (!DOODOCS_CLIENT_ID || !DOODOCS_CLIENT_SECRET)
    return NextResponse.json(
      { status: "error", message: "doodocs_not_configured" },
      { status: 503 }
    );

  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access)
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

  const payload = verifyAccessToken(access);
  if (!payload?.sub)
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { fileUrl, contractName, projectDocumentId } = body as {
    fileUrl?: string;
    contractName?: string;
    projectDocumentId?: string;
  };

  if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("http"))
    return NextResponse.json(
      { status: "error", message: "fileUrl required and must be a direct document URL" },
      { status: 400 }
    );
  if (!projectDocumentId || typeof projectDocumentId !== "string")
    return NextResponse.json(
      { status: "error", message: "projectDocumentId required for DOODOCS (agreement → developer)" },
      { status: 400 }
    );

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: object) => controller.enqueue(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));
      try {
        send({ step: "prepare", message: STEPS.prepare });
        const base = getStrapiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
        const headers = getStrapiHeaders();

        const customerUrl =
          `${base}/api/customers` +
          `?filters[id][$eq]=${payload.sub}` +
          `&pagination[pageSize]=1`;
        const customerRes = await strapiAxios.get(customerUrl, { headers });
        const customerItem: any = (customerRes.data as any)?.data?.[0];
        if (!customerItem?.id) {
          send({ step: "error", message: "customer_not_found" });
          controller.close();
          return;
        }

        const attrs = customerItem?.attributes ?? customerItem;
        const email = (attrs.email ?? customerItem.email ?? "").trim() || undefined;
        const iin = formatIin(attrs.iin ?? customerItem.iin);
        const phone = toE164(attrs.phone ?? customerItem.phone);

        if (!iin || iin.length !== 12) {
          send({ step: "error", message: "customer_iin_invalid" });
          controller.close();
          return;
        }
        if (!email) {
          send({ step: "error", message: "customer_email_required" });
          controller.close();
          return;
        }

        const agreementsUrl =
          `${base}/api/agreements` +
          `?filters[project][documentId][$eq]=${encodeURIComponent(projectDocumentId)}` +
          `&pagination[pageSize]=1` +
          `&populate[project][populate][developer]=true`;
        const agreementsRes = await strapiAxios.get(agreementsUrl, { headers });
        const agreementItem: any = (agreementsRes.data as any)?.data?.[0];
        if (!agreementItem) {
          send({ step: "error", message: "agreement_not_found" });
          controller.close();
          return;
        }

        const project = agreementItem?.project ?? agreementItem?.attributes?.project?.data ?? agreementItem?.attributes?.project;
        const developer = project?.developer ?? project?.attributes?.developer?.data ?? project?.attributes?.developer;
        const developerName = (developer?.name ?? developer?.attributes?.name ?? "Застройщик").trim() || "Застройщик";
        const companyBin = formatBin(developer?.bin ?? developer?.attributes?.bin);
        if (!companyBin || companyBin.length !== 12) {
          send({ step: "error", message: "developer_bin_invalid" });
          controller.close();
          return;
        }

        const pdfRes = await fetch(fileUrl);
        if (!pdfRes.ok) {
          send({ step: "error", message: "document_download_failed" });
          controller.close();
          return;
        }
        const fileBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const contentType = pdfRes.headers.get("content-type") || "application/pdf";
        const isDocx = contentType.includes("wordprocessingml") || /\.docx$/i.test(fileUrl);
        const docName = sanitizeDocumentName(contractName, isDocx);

        send({ step: "token", message: STEPS.token });
        const bearerToken = await getDoodocsToken();
        send({ step: "teamspace", message: STEPS.teamspace });
        const teamspaceId = await getOrCreateTeamspace(bearerToken, developerName);
        send({ step: "upload", message: STEPS.upload });
        const documentId = await uploadDocument(
          bearerToken,
          fileBuffer,
          docName,
          teamspaceId,
          isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : contentType
        );

        send({ step: "workflow", message: STEPS.workflow });
        await createWorkflowAndLaunch(
          bearerToken,
          documentId,
          email,
          iin,
          DOODOCS_COMPANY_EMAIL,
          companyBin
        );

        send({ step: "link", message: STEPS.link });
        const shareLink = await getDocumentShareLink(bearerToken, documentId);
        const signUrl = `${DOODOCS_LINK_BASE}/${shareLink}`;

        if (phone) {
          send({ step: "whatsapp", message: STEPS.whatsapp });
          const msg = `Здравствуйте! Ссылка для подписания договора: ${signUrl}`;
          await sendWhatsApp(phone, msg, { templateLink: signUrl, templateName: "document2" });
        }

        send({ step: "done", message: STEPS.done, signUrl, documentId });
      } catch (e: any) {
        console.error("doodocs/send-to-sign error:", e);
        send({ step: "error", message: e?.message ?? "server_error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
    },
  });
}
