import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";

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
 * GET: данные документа текущего пользователя (customer по id = payload.sub).
 * Для профиля: если все поля заполнены — возвращаем data, иначе found: false.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const headers = getStrapiHeaders();

    const findUrl =
      `${base}/api/customers` +
      `?filters[id][$eq]=${encodeURIComponent(payload.sub)}` +
      `&pagination[pageSize]=1`;

    const found = await strapiAxios.get(findUrl, { headers });
    const customerItem: any = found?.data?.data?.[0];

    if (!customerItem?.id)
      return NextResponse.json({ status: "ok", found: false });

    const attrs = customerItem?.attributes ?? customerItem;
    const phone = String(attrs.phone ?? customerItem.phone ?? "").trim();
    const surname = String(attrs.surname ?? customerItem.surname ?? "").trim();
    const name = String(attrs.name ?? customerItem.name ?? "").trim();
    const middlename = String(attrs.middlename ?? customerItem.middlename ?? "").trim();
    const gender = String(attrs.gender ?? customerItem.gender ?? "").trim();
    const birthDate = attrs.birthDate ?? customerItem.birthDate ?? null;
    const docNumber = String(attrs.docNumber ?? customerItem.docNumber ?? "").trim();
    const docIssuer = String(attrs.docIssuer ?? customerItem.docIssuer ?? "").trim();
    const dateIssue = attrs.dateIssue ?? customerItem.dateIssue ?? null;
    const iin = normalizeIin(attrs.iin ?? customerItem.iin ?? "");

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
        phone: phone || undefined,
        iin: iin.length === 12 ? iin : undefined,
        email,
        address,
      },
    });
  } catch (e) {
    console.error("profile/customer-doc error:", e);
    return NextResponse.json(
      { status: "error", message: "server_error" },
      { status: 500 }
    );
  }
}
