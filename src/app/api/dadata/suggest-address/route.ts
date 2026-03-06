import { NextResponse } from "next/server";

const DADATA_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";

export interface DaDataAddressSuggestion {
  value: string;
  unrestricted_value: string;
  data: Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const token = process.env.DADATA_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "DaData API token not configured" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    const res = await fetch(DADATA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        query,
        locations: [{ country: "Казахстан" }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("DaData suggest-address error:", res.status, text);
      return NextResponse.json(
        { error: "Address suggestion service unavailable" },
        { status: 502 }
      );
    }

    const json = (await res.json()) as { suggestions?: DaDataAddressSuggestion[] };
    const suggestions = Array.isArray(json?.suggestions) ? json.suggestions : [];
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("DaData suggest-address error:", e);
    return NextResponse.json(
      { error: "Address suggestion failed" },
      { status: 500 }
    );
  }
}
