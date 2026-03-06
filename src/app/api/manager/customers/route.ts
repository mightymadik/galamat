import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone } from "@/lib/authOtp";

function ensureManager(
  payload: { sub?: string | number; role?: string },
  base: string,
  headers: Record<string, string>
) {
  let isManager = payload.role === "manager" || payload.role === "admin";
  if (!isManager && payload.sub != null) {
    return strapiAxios
      .get(`${base}/api/customers?filters[id][$eq]=${payload.sub}&pagination[pageSize]=1&fields[0]=role`, { headers })
      .then((customerRes: any) => {
        const customer = (customerRes?.data as any)?.data?.[0];
        const currentRole = customer?.role ?? customer?.attributes?.role ?? payload.role;
        return currentRole === "manager" || currentRole === "admin";
      })
      .catch(() => false);
  }
  return Promise.resolve(isManager);
}

/**
 * POST /api/manager/customers
 * Create or update customer by phone (no deal attach). Body: phone, email?, address?, name?, surname?, middlename?, iin?, birthDate?, docNumber?, docIssuer?, dateIssue?
 * Returns { documentId } for renewal flow.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const isManager = await ensureManager(payload, base, headers);
    if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const phone = body?.phone != null ? String(body.phone).trim() : "";
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

    const updateData: Record<string, unknown> = { phone: normalizedPhone };
    if (body?.email != null) updateData.email = body.email === "" ? null : String(body.email).trim();
    if (body?.address != null) updateData.address = body.address === "" ? null : String(body.address).trim();
    if (body?.name != null) updateData.name = String(body.name).trim();
    if (body?.surname != null) updateData.surname = String(body.surname).trim();
    if (body?.middlename != null) updateData.middlename = String(body.middlename).trim();
    if (body?.iin != null && body.iin !== "") {
      const v = String(body.iin).replace(/\D/g, "");
      updateData.iin = v ? parseInt(v, 10) : null;
    }
    if (body?.birthDate != null) updateData.birthDate = body.birthDate === "" ? null : String(body.birthDate).trim();
    if (body?.docNumber != null && body.docNumber !== "") {
      const v = String(body.docNumber).replace(/\D/g, "");
      updateData.docNumber = v ? parseInt(v, 10) : null;
    }
    if (body?.docIssuer != null) updateData.docIssuer = String(body.docIssuer).trim();
    if (body?.dateIssue != null) updateData.dateIssue = body.dateIssue === "" ? null : String(body.dateIssue).trim();

    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;
    const foundRes = await strapiAxios.get(findUrl, { headers });
    const list = (foundRes.data as any)?.data ?? [];
    const existing = list[0];

    let documentId: string | null = null;
    if (existing?.documentId || existing?.id) {
      const key = existing?.documentId ?? existing?.id;
      await strapiAxios.put(`${base}/api/customers/${key}`, { data: updateData }, { headers });
      documentId = String(key);
    } else {
      const createRes = await strapiAxios.post(
        `${base}/api/customers`,
        { data: { ...updateData, role: "customer" } },
        { headers }
      );
      const created = (createRes.data as any)?.data ?? createRes.data;
      documentId = created?.documentId ?? created?.id ?? null;
    }
    if (!documentId) return NextResponse.json({ error: "Не удалось сохранить клиента" }, { status: 502 });
    return NextResponse.json({ documentId });
  } catch (e: any) {
    console.error("[manager/customers POST]", e?.response?.data ?? e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

/**
 * GET /api/manager/customers?phone=... or ?q=...
 * Search customers by phone (exact or contains) or by q (name/surname/phone contains).
 * For manager renewal flow: select existing client.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const base = getStrapiBaseUrl().replace(/\/$/, "").replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const isManager = await ensureManager(payload, base, headers);
    if (!isManager) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";
    const documentId = searchParams.get("documentId")?.trim() || "";
    const iinParam = searchParams.get("iin")?.trim()?.replace(/\D/g, "") || "";

    let filters = "pagination[pageSize]=20&sort[0]=createdAt:desc";
    if (documentId) {
      filters = `filters[documentId][$eq]=${encodeURIComponent(documentId)}&pagination[pageSize]=1`;
    } else if (iinParam.length === 11 || iinParam.length === 12) {
      filters = `pagination[pageSize]=10&sort[0]=createdAt:desc`;
      const iin11 = iinParam.length === 12 && iinParam.startsWith("0") ? iinParam.slice(1) : iinParam.length === 11 ? iinParam : iinParam.slice(-11);
      const iin12 = iin11.padStart(12, "0");
      filters += `&filters[$or][0][iin][$eq]=${encodeURIComponent(iin11)}`;
      if (iin11 !== iin12) filters += `&filters[$or][1][iin][$eq]=${encodeURIComponent(iin12)}`;
    } else {
      if (phone) {
        filters += `&filters[phone][$containsi]=${encodeURIComponent(phone)}`;
      }
      if (q) {
        filters +=
          `&filters[$or][0][name][$containsi]=${encodeURIComponent(q)}` +
          `&filters[$or][1][surname][$containsi]=${encodeURIComponent(q)}` +
          `&filters[$or][2][phone][$containsi]=${encodeURIComponent(q)}`;
      }
    }

    const fields =
      "fields[0]=documentId&fields[1]=name&fields[2]=surname&fields[3]=phone&fields[4]=email&fields[5]=iin";
    const url = `${base}/api/customers?${filters}&${fields}`;
    const res = await strapiAxios.get(url, { headers });
    const list: any[] = (res.data as any)?.data ?? [];

    const customers = list.map((c: any) => {
      const attrs = c?.attributes ?? c;
      return {
        documentId: c?.documentId ?? c?.id,
        name: attrs?.name ?? c?.name ?? "",
        surname: attrs?.surname ?? c?.surname ?? "",
        phone: attrs?.phone ?? c?.phone ?? "",
        email: attrs?.email ?? c?.email ?? "",
        iin: attrs?.iin ?? c?.iin ?? "",
      };
    });

    return NextResponse.json({ customers });
  } catch (e: any) {
    console.error("[manager/customers]", e?.response?.data ?? e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
