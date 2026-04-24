import { NextRequest, NextResponse } from "next/server";
import { fetchPropertyDetail } from "@/app/api/properties/detailServer";
import type { RealEstateType } from "@/types/flat";

function parseType(raw: string | null): RealEstateType {
  if (raw === "commerce" || raw === "parking" || raw === "pantry") return raw;
  return "property";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const type = parseType(request.nextUrl.searchParams.get("type"));
    const property = await fetchPropertyDetail(id, type);
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    console.error("Error in properties [id] API route:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}
