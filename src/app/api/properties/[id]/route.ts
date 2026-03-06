import { NextRequest, NextResponse } from "next/server";
import { getPropertyByDocumentId, getPropertyById } from "@/app/api/properties/getProperties";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    let property = await getPropertyByDocumentId(id);

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (error) {
    console.error("Error in properties [id] API route:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}
