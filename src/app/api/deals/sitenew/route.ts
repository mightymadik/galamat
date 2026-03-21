import { NextResponse } from "next/server";

type PaymentScheduleItem = {
  date?: string;
  sum?: string | number;
  status?: string;
  id?: string | number;
};

type SiteNewWebhookBody = {
  token?: string;
  status?: string;
  last_name?: string;
  name?: string;
  second_name?: string;
  birth_date?: string;
  iin?: string;
  passport_number?: string;
  passport_date?: string;
  passport_issued?: string;
  buyer_address?: string;
  phone?: string;
  email?: string;
  bank?: string;
  bik?: string;
  iik?: string;
  flat_number?: string;
  jk?: string;
  block?: string;
  section?: string;
  floor?: string | number;
  square?: string | number;
  flat_id?: string | number;
  buy_type?: string;
  price?: string | number;
  price_m2?: string | number;
  company?: string;
  contract_number?: string;
  promo_code?: string;
  promo_sum?: string | number;
  gala_bonus_sum?: string | number;
  contract_file?: string;
  extra_file?: string;
  payment_schedule?: PaymentScheduleItem[];
};

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SiteNewWebhookBody;

    const expectedToken = process.env.BITRIX_WEBHOOK_TOKEN || "";
    const incomingToken = asString(body.token);
    if (!incomingToken) {
      return NextResponse.json(
        { ok: false, error: "token is required" },
        { status: 400 }
      );
    }
    if (expectedToken && incomingToken !== expectedToken) {
      return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
    }

    const validStatuses = ["registration", "termination", "reissue"];
    const bodyStatus = asString(body.status).toLowerCase();
    if (!validStatuses.includes(bodyStatus)) {
      return NextResponse.json(
        { ok: false, error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const webhookUrl =
      process.env.BITRIX_WEBHOOK_URL ||
      "https://crm.galamat.kz/services/webhooks/sitenew/index.php";

    const payload: SiteNewWebhookBody = {
      ...body,
      token: incomingToken,
      status: bodyStatus,
      payment_schedule: Array.isArray(body.payment_schedule)
        ? body.payment_schedule.map((item) => ({
            date: asString(item?.date),
            sum: asString(item?.sum),
            status: asString(item?.status || "Ожидается"),
            id: asString(item?.id),
          }))
        : [],
    };

    const bitrixRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await bitrixRes.text();
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // keep plain text if webhook returns non-json
    }

    return NextResponse.json(
      {
        ok: bitrixRes.ok,
        upstreamStatus: bitrixRes.status,
        data: parsed,
      },
      { status: bitrixRes.ok ? 200 : bitrixRes.status || 502 }
    );
  } catch (err: any) {
    console.error("[deals/sitenew] error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "server_error" },
      { status: 500 }
    );
  }
}
