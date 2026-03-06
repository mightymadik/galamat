import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { normalizePhone } from "@/lib/authOtp";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access)
      return Response.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub)
      return Response.json({ status: "error", message: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { phone: bodyPhone, email, address } = body as {
      phone?: string;
      email?: string;
      address?: string;
    };

    if (!bodyPhone || typeof bodyPhone !== "string")
      return NextResponse.json(
        { status: "error", message: "phone is required" },
        { status: 400 }
      );

    const baseRaw = getStrapiBaseUrl();
    const base = baseRaw.replace(/\/api\/?$/, "").replace(/\/$/, "");
    const headers = getStrapiHeaders();
    const normalizedPhone = normalizePhone(bodyPhone.trim());

    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const found = await strapiAxios.get(findUrl, { headers });
    const customerItem: any = found?.data?.data?.[0];

    if (!customerItem?.id)
      return NextResponse.json(
        { status: "error", message: "customer_not_found" },
        { status: 404 }
      );

    const isManagerOrAdmin = payload.role === "manager" || payload.role === "admin";
    if (!isManagerOrAdmin && customerItem.id !== payload.sub)
      return NextResponse.json(
        { status: "error", message: "forbidden" },
        { status: 403 }
      );

    const updateKey =
      customerItem?.documentId ??
      customerItem?.attributes?.documentId ??
      customerItem.id;

    const updatePayload: Record<string, unknown> = {};
    if (email !== undefined) updatePayload.email = email == null || email === "" ? null : String(email).trim();
    if (address !== undefined) updatePayload.address = address == null || address === "" ? null : String(address).trim();

    if (Object.keys(updatePayload).length === 0)
      return NextResponse.json({ status: "ok", updated: false });

    await strapiAxios.put(
      `${base}/api/customers/${updateKey}`,
      { data: updatePayload },
      { headers }
    );

    return NextResponse.json({ status: "ok", updated: true });
  } catch (e) {
    console.error("customer update-contact error:", e);
    return NextResponse.json(
      { status: "error", message: "server_error" },
      { status: 500 }
    );
  }
}
