import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone } from "@/lib/authOtp";

/** Normalize IIN to 12 digits string for comparison (pad with leading 0 if 11 digits, e.g. Strapi stores "21114551221") */
function normalizeIin(value: string | number | null | undefined): string {
  const s = String(value ?? "").replace(/\D/g, "");
  if (s.length >= 12) return s.slice(0, 12);
  if (s.length === 11) return "0" + s;
  return s;
}

function formatDateApiToDisplay(iso?: string | null): string {
  if (!iso) return "";
  const str = String(iso).slice(0, 10);
  const [y, m, d] = str.split("-");
  if (!d || !m || !y) return str;
  return `${d}.${m}.${y}`;
}

/**
 * POST /api/customer/check-doc
 * Body: { phone: string, iin: string }
 * Returns customer doc data if customer exists for this phone, IIN matches, and all required doc fields are filled.
 * Used to skip biometric request when we already have the data in Strapi.
 */
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
    const { phone: bodyPhone, iin: bodyIin } = body as { phone?: string; iin?: string };
    if (!bodyPhone || typeof bodyPhone !== "string")
      return NextResponse.json(
        { status: "error", message: "phone is required" },
        { status: 400 }
      );
    if (!bodyIin || typeof bodyIin !== "string")
      return NextResponse.json(
        { status: "error", message: "iin is required" },
        { status: 400 }
      );

    const normalizedPhone = normalizePhone(bodyPhone.trim());
    const requestedIin = normalizeIin(bodyIin.trim());
    if (requestedIin.length !== 12)
      return NextResponse.json(
        { status: "error", message: "invalid_iin" },
        { status: 400 }
      );

    const isManagerOrAdmin = payload.role === "manager" || payload.role === "admin";
    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const found = await strapiAxios.get(findUrl, { headers });
    const customerItem: any = found?.data?.data?.[0];

    if (!customerItem?.id)
      return NextResponse.json({ status: "ok", found: false });

    if (!isManagerOrAdmin && customerItem.id !== payload.sub)
      return NextResponse.json({ status: "error", message: "forbidden" }, { status: 403 });

    const attrs = customerItem?.attributes ?? customerItem;
    const customerIin = normalizeIin(attrs.iin ?? customerItem.iin);
    if (customerIin !== requestedIin)
      return NextResponse.json({ status: "ok", found: false });

    const surname = String(attrs.surname ?? customerItem.surname ?? "").trim();
    const name = String(attrs.name ?? customerItem.name ?? "").trim();
    const middlename = String(attrs.middlename ?? customerItem.middlename ?? "").trim();
    const gender = String(attrs.gender ?? customerItem.gender ?? "").trim();
    const birthDate = attrs.birthDate ?? customerItem.birthDate ?? null;
    const docNumber = String(attrs.docNumber ?? customerItem.docNumber ?? "").trim();
    const docIssuer = String(attrs.docIssuer ?? customerItem.docIssuer ?? "").trim();
    const dateIssue = attrs.dateIssue ?? customerItem.dateIssue ?? null;

    const hasAllRequired =
      !!surname &&
      !!name &&
      !!middlename &&
      !!gender &&
      !!docNumber &&
      !!docIssuer &&
      birthDate != null &&
      String(birthDate).trim() !== "" &&
      dateIssue != null &&
      String(dateIssue).trim() !== "";

    if (!hasAllRequired)
      return NextResponse.json({ status: "ok", found: false });

    const email = String(attrs.email ?? customerItem.email ?? "").trim();
    const address = String(attrs.address ?? customerItem.address ?? "").trim();

    return NextResponse.json({
      status: "ok",
      found: true,
      data: {
        lastName: surname,
        firstName: name,
        middleName: middlename,
        gender,
        dateOfBirth: formatDateApiToDisplay(birthDate),
        docNumber,
        docIssuer,
        dateOfIssue: formatDateApiToDisplay(dateIssue),
        phone: normalizedPhone,
        email,
        address,
      },
    });
  } catch (e) {
    console.error("customer check-doc error:", e);
    return NextResponse.json(
      { status: "error", message: "server_error" },
      { status: 500 }
    );
  }
}
