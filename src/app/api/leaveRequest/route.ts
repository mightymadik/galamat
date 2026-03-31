import { NextResponse } from "next/server";
import { rateLimit } from "../../../middleware/rate-limit";

const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 11;
const NAME_MAX_LENGTH = 80;
const PROJECT_MAX_LENGTH = 120;
const UTM_MAX_LENGTH = 120;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return escapeHtml(compact);
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < PHONE_DIGITS_MIN || digits.length > PHONE_DIGITS_MAX) return null;
  if (digits.length === PHONE_DIGITS_MAX && !digits.startsWith("7")) return null;
  return digits;
}

export async function POST(req: Request) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const allowed = await rateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isPlainObject(body)) {
      return NextResponse.json({ ok: false, error: "Body must be a JSON object" }, { status: 400 });
    }

    const name = normalizeText(body.name, NAME_MAX_LENGTH);
    const phoneDigits = normalizePhone(body.phone);
    const projectName = normalizeText(body.project_name, PROJECT_MAX_LENGTH);
    const utmSource = normalizeText(body.utm_source, UTM_MAX_LENGTH);
    const utmMedium = normalizeText(body.utm_medium, UTM_MAX_LENGTH);
    const utmCampaign = normalizeText(body.utm_campaign, UTM_MAX_LENGTH);
    const utmContent = normalizeText(body.utm_content, UTM_MAX_LENGTH);
    const utmTerm = normalizeText(body.utm_term, UTM_MAX_LENGTH);

    if (!name) {
      return NextResponse.json({ ok: false, error: "Field 'name' is required" }, { status: 400 });
    }
    if (!phoneDigits) {
      return NextResponse.json({ ok: false, error: "Field 'phone' must be a valid phone number" }, { status: 400 });
    }

    const params = new URLSearchParams({
      "FIELDS[PHONE][0][VALUE]": phoneDigits,
      "FIELDS[PHONE][0][VALUE_TYPE]": "MOBILE",
      "FIELDS[NAME]": name,
      "FIELDS[SOURCE_ID]": "STORE",
    });

    
    if (projectName) {
      params.append("FIELDS[UF_CRM_1718281646]", projectName);
    }

    // Add UTM parameters to Bitrix24 fields if provided
    if (utmSource) {
      params.append("FIELDS[UTM_SOURCE]", utmSource);
    }
    if (utmMedium) {
      params.append("FIELDS[UTM_MEDIUM]", utmMedium);
    }
    if (utmCampaign) {
      params.append("FIELDS[UTM_CAMPAIGN]", utmCampaign);
    }
    if (utmContent) {
      params.append("FIELDS[UTM_CONTENT]", utmContent);
    }
    if (utmTerm) {
      params.append("FIELDS[UTM_TERM]", utmTerm);
    }

    const url = `https://crm.galamat.kz/rest/25451/see0f8hgdnl3zme4/crm.lead.add.json?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "bitrix_request_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "internal_server_error" }, { status: 500 });
  }
}
