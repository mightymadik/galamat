import { NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rate-limit";

const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 120;
const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 11;
const CV_MAX_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeText(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizePhone(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < PHONE_DIGITS_MIN || digits.length > PHONE_DIGITS_MAX) return null;
  if (digits.length === PHONE_DIGITS_MAX && !digits.startsWith("7")) return null;
  return digits;
}

function normalizeEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function getBitrixFieldAliases(fieldCode: string): string[] {
  const normalized = fieldCode.trim();
  if (!normalized) return [];

  const aliases = new Set<string>([normalized]);
  const legacyMatch = normalized.match(/^UF_CRM_(\d+)_(.+)$/i);
  if (legacyMatch) {
    const [, entityId, suffix] = legacyMatch;
    aliases.add(`ufCrm${entityId}_${suffix}`);
  }
  return [...aliases];
}

function setFieldWithAliases(
  target: Record<string, unknown>,
  fieldCode: string,
  value: unknown
): void {
  for (const alias of getBitrixFieldAliases(fieldCode)) {
    target[alias] = value;
  }
}

export async function POST(req: Request) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const allowed = await rateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
    }

    const formData = await req.formData();
    const fullName = normalizeText(formData.get("name"), NAME_MAX_LENGTH);
    const phoneDigits = normalizePhone(formData.get("phone"));
    const email = normalizeEmail(formData.get("email"));
    const cv = formData.get("cv");

    if (!fullName) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }
    if (!phoneDigits) {
      return NextResponse.json({ ok: false, error: "phone_invalid" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: "email_invalid" }, { status: 400 });
    }
    if (!(cv instanceof File) || cv.size === 0) {
      return NextResponse.json({ ok: false, error: "cv_required" }, { status: 400 });
    }
    if (cv.size > CV_MAX_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: "cv_too_large" }, { status: 400 });
    }

    const webhook = getRequiredEnv("BITRIX_HR_WEBHOOK");
    const smartProcessId = getRequiredEnv("BITRIX_SMART_PROCESS_ID");
    const stageId = getRequiredEnv("BITRIX_SMART_PROCESS_STAGE_ID");
    const cvField = getRequiredEnv("BITRIX_CV_FIELD");
    const fullNameField = getRequiredEnv("BITRIX_FULLNAME_FIELD");
    const phoneField = getRequiredEnv("BITRIX_PHONE_FIELD");
    const emailField = getRequiredEnv("BITRIX_EMAIL_FIELD");

    const cvBuffer = Buffer.from(await cv.arrayBuffer());
    const cvBase64 = cvBuffer.toString("base64");
    const title = `HR заявка: ${fullName}`;
    const fields: Record<string, unknown> = {
      title,
      stageId,
    };
    setFieldWithAliases(fields, fullNameField, fullName);
    setFieldWithAliases(fields, phoneField, phoneDigits);
    setFieldWithAliases(fields, emailField, email);
    setFieldWithAliases(fields, cvField, {
      fileData: [cv.name, cvBase64],
    });

    const endpointBase = webhook.endsWith("/") ? webhook.slice(0, -1) : webhook;
    const bitrixRes = await fetch(`${endpointBase}/crm.item.add.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityTypeId: Number(smartProcessId),
        fields,
      }),
    });

    const bitrixPayload = await bitrixRes.json().catch(() => ({}));
    if (!bitrixRes.ok || bitrixPayload?.error) {
      console.error("[api/hr-request] bitrix error", {
        status: bitrixRes.status,
        payload: bitrixPayload,
      });
      return NextResponse.json({ ok: false, error: "bitrix_request_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, result: bitrixPayload?.result ?? null });
  } catch (error) {
    console.error("[api/hr-request] unexpected error", error);
    return NextResponse.json({ ok: false, error: "internal_server_error" }, { status: 500 });
  }
}
