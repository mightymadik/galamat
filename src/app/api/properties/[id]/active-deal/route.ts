import { NextResponse } from "next/server";
import { fetchActiveDealStatus } from "@/app/api/properties/detailServer";
import type { RealEstateType } from "@/types/flat";

function parseType(raw: string | null): RealEstateType {
  if (raw === "commerce" || raw === "parking" || raw === "pantry") return raw;
  return "property";
}

/** GET: активная сделка по объекту — тонкая обертка над fetchActiveDealStatus */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const url = new URL(request.url);
    const type = parseType(url.searchParams.get("type"));
    const status = await fetchActiveDealStatus(id, type);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error("[properties/active-deal]", err?.response?.data ?? err);
    return NextResponse.json(
      { hasActiveDeal: true, canResume: false, dealDocumentId: null },
      { status: 200 },
    );
  }
}
