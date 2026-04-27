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
    const fromBound = typeof body?.from_bound?.value === "string" ? body.from_bound.value : undefined;
    const toBound = typeof body?.to_bound?.value === "string" ? body.to_bound.value : undefined;
    const rawCount = typeof body?.count === "number" ? body.count : undefined;
    const count = typeof rawCount === "number" && Number.isFinite(rawCount)
      ? Math.min(20, Math.max(1, Math.trunc(rawCount)))
      : 10;
    const locations = Array.isArray(body?.locations) ? body.locations : undefined;
    const hasLocations = Array.isArray(locations) && locations.length > 0;

    if (!query) {
      return NextResponse.json({ suggestions: [] });
    }

    const payload: Record<string, unknown> = {
      query,
      count,
      locations: hasLocations ? locations : [{ country: "Казахстан" }],
    };

    if (fromBound) payload.from_bound = { value: fromBound };
    if (toBound) payload.to_bound = { value: toBound };

    const res = await fetch(DADATA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(payload),
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
