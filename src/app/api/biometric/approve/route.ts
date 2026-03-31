import { NextResponse } from "next/server";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone, isValidKzPhoneE164 } from "@/lib/authOtp";
import { mapBiometricError } from "@/lib/biometricErrors";

const BIOMETRIC_BASE = "https://kyc.biometric.kz/api/v1/backend/e-document/online-access";
const BIOMETRIC_TIMEOUT_MS = 25_000;

/** Customer fields we can fill from biometric response (matches Strapi customer schema). IIN as string to preserve leading zero. */
interface BiometricCustomerFields {
  name: string;
  surname: string;
  middlename: string;
  iin: string | null;
  gender: "Мужской" | "Женский" | null;
  birthDate: string | null;
  docNumber: number | null;
  docIssuer: string | null;
  dateIssue: string | null;
  dateExpire: string | null;
}

function parseBiometricData(data: any): BiometricCustomerFields {
  const common = data?.result_json?.common ?? {};
  const owner = common?.docOwner ?? {};
  const issuer = common?.docIssuer ?? {};
  const extra = data?.extra ?? {};

  const firstName = String(owner?.firstName ?? "").trim();
  const lastName = String(owner?.lastName ?? "").trim();
  const middleName =
    String(owner?.middleName ?? owner?.middlename ?? "").trim();

  const genderRaw = String(data?.gender ?? "").toLowerCase();
  const gender: "Мужской" | "Женский" | null =
    genderRaw === "male" ? "Мужской" : genderRaw === "female" ? "Женский" : null;

  const birthDate = extra?.date_of_birth
    ? String(extra.date_of_birth).slice(0, 10)
    : null;
  const dateIssue = extra?.date_of_issue
    ? String(extra.date_of_issue).slice(0, 10)
    : null;
  const dateExpire = extra?.date_of_expire
    ? String(extra.date_of_expire).slice(0, 10)
    : null;

  const iinStr = String(owner?.iin ?? "").replace(/\D/g, "");
  const iin = iinStr.length === 12 ? iinStr : iinStr.length === 11 ? "0" + iinStr : null;

  const docNumberStr = String(common?.docNumber ?? "").replace(/\D/g, "");
  const docNumber = docNumberStr.length > 0 ? parseInt(docNumberStr, 10) : null;

  const docIssuer =
    String(issuer?.nameRu ?? issuer?.nameEn ?? issuer?.nameKk ?? "").trim() ||
    null;

  return {
    name: firstName || "—",
    surname: lastName || "—",
    middlename: middleName || "—",
    iin,
    gender,
    birthDate,
    docNumber,
    docIssuer,
    dateIssue,
    dateExpire,
  };
}

function toStrapiPayload(fields: BiometricCustomerFields) {
  const payload: Record<string, unknown> = {
    name: fields.name,
    surname: fields.surname,
    middlename: fields.middlename,
  };
  if (fields.iin != null) payload.iin = fields.iin;
  if (fields.gender != null) payload.gender = fields.gender;
  if (fields.birthDate != null) payload.birthDate = fields.birthDate;
  if (fields.docNumber != null) payload.docNumber = fields.docNumber;
  if (fields.docIssuer != null) payload.docIssuer = fields.docIssuer;
  if (fields.dateIssue != null) payload.dateIssue = fields.dateIssue;
  if (fields.dateExpire != null) payload.dateExpire = fields.dateExpire;
  return payload;
}

/**
 * Find customer by phone (manager-typed or current user's). Update existing or create new.
 */
async function syncCustomerFromBiometric(
  phone: string,
  fields: BiometricCustomerFields
) {
  const baseRaw = getStrapiBaseUrl();
  const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const headers = getStrapiHeaders();

  const findUrl =
    `${base}/api/customers` +
    `?filters[phone][$eq]=${encodeURIComponent(phone)}` +
    `&pagination[pageSize]=1`;

  const found = await strapiAxios.get(findUrl, { headers });
  const customerItem: any = found?.data?.data?.[0];

  const payload = toStrapiPayload(fields);

  if (customerItem?.id) {
    const updateKey =
      customerItem?.documentId ??
      customerItem?.attributes?.documentId ??
      customerItem.id;
    await strapiAxios.put(
      `${base}/api/customers/${updateKey}`,
      { data: payload },
      { headers }
    );
    return { action: "updated" as const, id: customerItem.id };
  }

  const created = await strapiAxios.post(
    `${base}/api/customers`,
    {
      data: {
        phone,
        active: "active",
        ...payload,
      },
    },
    { headers }
  );

  return { action: "created" as const, id: created?.data?.data?.id };
}

function stripHeavyFields(biometricResponse: any) {
  // чтобы не отдавать мегабайты base64 наружу
  if (!biometricResponse || typeof biometricResponse !== "object") return biometricResponse;
  const {
    document_pdf,
    document_image,
    face_photo,
    qrcode,
    barcode,
    ...rest
  } = biometricResponse;
  return rest;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      backend_session_id,
      code,
      file = true,
      file_type = "pdf",
      phone: bodyPhone,
    } = body as {
      backend_session_id?: string;
      code?: string;
      file?: boolean;
      file_type?: string;
      phone?: string;
    };

    if (!backend_session_id || !code) {
      return NextResponse.json(
        { status: "error", message: "backend_session_id and code are required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BIOMETRIC_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${BIOMETRIC_BASE}/approve/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          backend_session_id: String(backend_session_id).trim(),
          code: String(code).trim(),
          file: Boolean(file),
          file_type: file_type || "pdf",
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr?.name === "AbortError";
      const isNetwork =
        fetchErr?.code === "ECONNREFUSED" ||
        fetchErr?.code === "ETIMEDOUT" ||
        fetchErr?.code === "ENOTFOUND" ||
        fetchErr?.message?.includes("fetch failed");
      const message = isAbort
        ? "biometric_service_timeout"
        : isNetwork
          ? "biometric_service_unavailable"
          : "server_error";
      console.error("Biometric approve: external request failed", fetchErr?.message ?? fetchErr);
      return NextResponse.json(
        { status: "error", message },
        { status: 502 }
      );
    }
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const mapped = mapBiometricError(res.status, data);
      return NextResponse.json(
        {
          status: "error",
          code: mapped.code,
          message: mapped.message,
        },
        { status: mapped.status }
      );
    }

    let customerSync: any = null;

    if (bodyPhone) {
      const normalizedPhone = normalizePhone(bodyPhone);
      if (isValidKzPhoneE164(normalizedPhone)) {
        const fields = parseBiometricData(data);

        try {
          customerSync = await syncCustomerFromBiometric(normalizedPhone, fields);
        } catch (syncErr: any) {
          console.error(
            "Biometric approve: sync customer failed",
            syncErr?.response?.data || syncErr
          );
          customerSync = { action: "failed", error: "sync_failed" };
        }
      } else {
        customerSync = { action: "skipped", error: "invalid_phone" };
      }
    } else {
      customerSync = { action: "skipped", error: "phone_not_provided" };
    }

    return NextResponse.json({
      status: "ok",
      customerSync,
      data: stripHeavyFields(data),
    });
  } catch (e) {
    console.error("Biometric approve error:", e);
    return NextResponse.json({ status: "error", message: "server_error" }, { status: 500 });
  }
}