import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "../../../../lib/strapiServer";
import { isValidKzPhoneE164, normalizePhone } from "../../../../lib/authOtp";

type StrapiList<T> = { data: Array<{ id: number; attributes: T; documentId?: string }> };

function getUpdateKey(item: any): string | number {
  return item?.documentId ?? item?.attributes?.documentId ?? item?.id;
}

export async function POST(req: Request) {
  try {
    const { phone, firstName, lastName } = await req.json().catch(() => ({}));

    if (!phone) {
      return Response.json({ status: "error", message: "phone_required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidKzPhoneE164(normalizedPhone)) {
      return Response.json({ status: "error", message: "invalid_phone" }, { status: 400 });
    }

    const name = String(firstName || "").trim();
    const surname = String(lastName || "").trim();
    if (!name || !surname) {
      return Response.json({ status: "error", message: "name_surname_required" }, { status: 400 });
    }

    const base = getStrapiBaseUrl();
    const headers = getStrapiHeaders();
    const nowIso = new Date().toISOString();

    // 1) найти customer по телефону (создан на send-code)
    const findUrl =
      `${base}/api/customers` +
      `?filters[phone][$eq]=${encodeURIComponent(normalizedPhone)}` +
      `&pagination[pageSize]=1`;

    const found = await strapiAxios.get(findUrl, { headers });
    const customerItem = (found.data as any)?.data?.[0];

    if (!customerItem?.id) {
      return Response.json({ status: "error", message: "customer_not_found" }, { status: 400 });
    }

    const customerId: number = customerItem.id;
    const role: string = customerItem?.attributes?.role || "customer";

    // ✅ ключ для обновления: documentId если есть, иначе id
    const updateKey = getUpdateKey(customerItem);

    await strapiAxios.put(
      `${base}/api/customers/${updateKey}`,
      {
        data: {
          name,
          surname,
          active: "active",
          // isPhoneVerified можно оставить true, если verify-code уже подтвердил телефон
          isPhoneVerified: true,
          lastLoginAt: nowIso,
        },
      },
      { headers }
    );

    const documentId = customerItem?.documentId ?? (customerItem as any)?.attributes?.documentId ?? String(customerId);
    return Response.json({
      status: "ok",
      user: { id: customerId, documentId, phone: normalizedPhone, role, name, surname },
    });
  } catch (err: any) {
    return Response.json(
      { status: "error", message: "server_error", error: err?.response?.data || err?.message },
      { status: 500 }
    );
  }
}