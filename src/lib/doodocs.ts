const DOODOCS_API_URL = (process.env.DOODOCS_API_URL ?? "https://api.doodocs.kz").replace(
  /\/$/,
  ""
);
/** Публичная ссылка на подписание: https://link.doodocs.kz/{link} */
export const DOODOCS_LINK_BASE =
  process.env.DOODOCS_LINK_BASE ?? "https://link.doodocs.kz";
const DOODOCS_WORKSPACE_ID = process.env.DOODOCS_WORKSPACE_ID;
const DOODOCS_COMPANY_EMAIL =
  process.env.DOODOCS_COMPANY_EMAIL ?? "galamat.company@gmail.com";
const WHATSAPP_API_URL =
  process.env.WHATSAPP_API_URL ?? "https://kazinfoteh.org/wasender/sendwamsg";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

export function sanitizeDocumentName(
  contractName: string | undefined,
  isDocx: boolean
): string {
  const raw = (contractName ?? "Договор").trim();
  const allowed = raw
    .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = allowed.slice(0, 150) || "document";
  return isDocx ? `${base}.docx` : `${base}.pdf`;
}

export async function getDoodocsToken(): Promise<string> {
  const clientId = process.env.DOODOCS_CLIENT_ID;
  const secret = process.env.DOODOCS_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("DOODOCS_CLIENT_ID and DOODOCS_CLIENT_SECRET required");
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");
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
  if (!token) throw new Error("DOODOCS token missing");
  return token;
}

export async function getOrCreateTeamspace(
  bearerToken: string,
  developerName: string
): Promise<string> {
  if (!DOODOCS_WORKSPACE_ID) throw new Error("DOODOCS_WORKSPACE_ID required");
  const listUrl = `${DOODOCS_API_URL}/api/v1/workspaces/${DOODOCS_WORKSPACE_ID}/teamspaces`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!listRes.ok)
    throw new Error(`DOODOCS list teamspaces failed: ${listRes.status} ${await listRes.text()}`);
  const listData = (await listRes.json().catch(() => ({}))) as {
    teamspaces?: Array<{ id?: string; name?: string }>;
  };
  const teamspaces = listData?.teamspaces ?? [];
  const normalized = (developerName || "Застройщик").trim().toLowerCase();
  const found = teamspaces.find(
    (t) => (t?.name ?? "").trim().toLowerCase() === normalized
  );
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
    throw new Error(
      `DOODOCS create teamspace failed: ${createRes.status} ${await createRes.text()}`
    );
  const createData = await createRes.json().catch(() => ({}));
  const id = createData?.teamspace_id ?? createData?.id;
  if (!id) throw new Error("DOODOCS teamspace_id missing");
  return String(id);
}

export async function uploadDocument(
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
  if (!res.ok)
    throw new Error(`DOODOCS upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json().catch(() => ({}));
  const documentId = data?.document_id ?? data?.id;
  if (!documentId) throw new Error("DOODOCS document_id missing");
  return String(documentId);
}

export async function createWorkflowAndLaunch(
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
                  origin_id: "",
                  role: "signer_rk",
                  attrs: { email: clientEmail, filter: [{ iin: clientIin }] },
                },
              ],
            },
            {
              index: 2,
              type: "signer_rk",
              recipients: [
                {
                  actor_id: 1,
                  origin_id: "",
                  role: "signer_rk",
                  attrs: {
                    email: companyEmail,
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
  if (!workflowRes.ok)
    throw new Error(
      `DOODOCS workflow failed: ${workflowRes.status} ${await workflowRes.text()}`
    );
  const launchRes = await fetch(
    `${DOODOCS_API_URL}/api/v1/documents/${documentId}/workflow/launch`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${bearerToken}` },
    },
  );
  if (!launchRes.ok)
    throw new Error(
      `DOODOCS launch failed: ${launchRes.status} ${await launchRes.text()}`
    );
}

/**
 * 1) GET /documents/{document_id}/recipients → взять первого получателя (клиент), recipient_id.
 * 2) GET /documents/{document_id}/recipients/{recipient_id} → взять recipient.link.
 * Публичная ссылка: https://link.doodocs.kz/{link}
 */
export async function getDocumentShareLink(
  bearerToken: string,
  documentId: string
): Promise<string> {
  const authHeader = { Authorization: `Bearer ${bearerToken}` };
  const base = `${DOODOCS_API_URL}/api/v1/documents/${documentId}`;

  const listRes = await fetch(`${base}/recipients`, { method: "GET", headers: authHeader });
  if (!listRes.ok) {
    throw new Error(`DOODOCS recipients failed: ${listRes.status} ${await listRes.text()}`);
  }
  const listData = (await listRes.json().catch(() => ({}))) as {
    recipients?: Array<{ recipient_id?: string }>;
  };
  const recipients = listData?.recipients ?? [];
  const first = recipients[0];
  const recipientId = first?.recipient_id;
  if (!recipientId || typeof recipientId !== "string") {
    throw new Error("DOODOCS recipients list empty or missing recipient_id");
  }

  const oneRes = await fetch(`${base}/recipients/${encodeURIComponent(recipientId)}`, {
    method: "GET",
    headers: authHeader,
  });
  if (!oneRes.ok) {
    throw new Error(`DOODOCS recipient failed: ${oneRes.status} ${await oneRes.text()}`);
  }
  const oneData = (await oneRes.json().catch(() => ({}))) as { recipient?: { link?: string } };
  const link = oneData?.recipient?.link;
  if (!link || typeof link !== "string") {
    throw new Error("DOODOCS recipient response missing link");
  }
  return link;
}

const WHATSAPP_FETCH_TIMEOUT_MS = 15_000;

/** Format phone for kazinfoteh: +7XXXXXXXXXX */
function formatPhoneForWhatsApp(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  const withCountry = digits.startsWith("7") ? digits : `7${digits}`;
  return `+${withCountry}`;
}

/** Template dogovor1 expects param1 = only the URL (link). */
function extractLinkForTemplate(message: string): string {
  const match = message.match(/\b(https?:\/\/[^\s]+)/);
  return match ? match[1].trim() : message;
}

async function sendWhatsAppRequest(
  url: string,
  headers: Record<string, string>,
  body: object,
  signal: AbortSignal | undefined
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export interface SendWhatsAppOptions {
  /**
   * Код ссылки для шаблона (document2 — кнопка URL-BTN1, dogovor1 — body param1).
   * Для document2 передаётся только код (например jOEt4YdpAc5HFLp3vBwX), не полный URL.
   */
  templateLink?: string;
  /** Шаблон "document2" — кнопка с ссылкой (keyboard.rows.buttons). Иначе "dogovor1" (bodyParameters.param1). */
  templateName?: "document2" | "dogovor1";
}

/** Из полного URL https://link.doodocs.kz/CODE извлекает CODE. */
function getLinkCode(urlOrCode: string): string {
  const trimmed = urlOrCode.trim();
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
  options?: SendWhatsAppOptions
): Promise<void> {
  const to = formatPhoneForWhatsApp(phone);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WHATSAPP_API_KEY) headers["x-api-key"] = WHATSAPP_API_KEY;
  const useDocument2 = options?.templateName === "document2";
  const linkCode = options?.templateLink != null ? getLinkCode(options.templateLink) : null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WHATSAPP_FETCH_TIMEOUT_MS);
  try {
    const templateBody =
      useDocument2 && linkCode
        ? {
            to,
            content: {
              whatsappContent: {
                contentType: "TEMPLATE",
                name: "document2",
                keyboard: {
                  rows: {
                    buttons: [{ type: "URL-BTN1", url: linkCode }],
                  },
                },
              },
            },
          }
        : {
            to,
            content: {
              whatsappContent: {
                contentType: "TEMPLATE",
                name: "dogovor1",
                bodyParameters: {
                  param1: linkCode ?? options?.templateLink ?? extractLinkForTemplate(message),
                },
              },
            },
          };
    const res = await sendWhatsAppRequest(WHATSAPP_API_URL, headers, templateBody, controller.signal);
    clearTimeout(timeoutId);
    if (res.ok) return;
    if (res.status === 400 && res.text.includes("System error") && !useDocument2) {
      console.warn("[WhatsApp] Template failed (400), retry as TEXT", res.text.slice(0, 80));
      const textBody = {
        to,
        content: {
          whatsappContent: {
            contentType: "TEXT",
            msg: message,
            previewUrl: true,
          },
        },
      };
      const res2 = await sendWhatsAppRequest(WHATSAPP_API_URL, headers, textBody, undefined);
      if (res2.ok) return;
      console.error("[WhatsApp] TEXT send error:", res2.status, res2.text.slice(0, 200));
      throw new Error(`WhatsApp send failed: ${res2.status} ${res2.text.slice(0, 200)}`);
    }
    console.error("[WhatsApp] send error:", res.status, res.text, "to:", to);
    if (res.status === 401) {
      console.error(
        "[WhatsApp] 401 Unauthorized — задайте WHATSAPP_API_KEY в .env или проверьте ключ (X-API-KEY)."
      );
    }
    throw new Error(`WhatsApp send failed: ${res.status} ${res.text.slice(0, 200)}`);
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError") {
      console.error("[WhatsApp] request timeout", WHATSAPP_FETCH_TIMEOUT_MS, "ms");
      throw new Error("WhatsApp send timeout");
    }
    console.error("[WhatsApp] fetch failed:", e?.message ?? e);
    throw e;
  }
}