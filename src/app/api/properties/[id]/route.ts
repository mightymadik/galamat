import { NextRequest, NextResponse } from "next/server";
import { getPropertyByDocumentId, getPropertyById } from "@/app/api/properties/getProperties";
import { apiGet } from "@/app/api/fetcher";

type RealEstateType = "property" | "commerce" | "parking" | "pantry";
const TYPE_CONFIG: Record<RealEstateType, { apiPath: string; statusField: string; numberField: string; supportsMedia: boolean }> = {
  property: { apiPath: "/api/properties", statusField: "propertyStatus", numberField: "apartmentNumber", supportsMedia: true },
  commerce: { apiPath: "/api/commerces", statusField: "commerceStatus", numberField: "commerceNumber", supportsMedia: true },
  parking: { apiPath: "/api/parkings", statusField: "parkingStatus", numberField: "parkingNumber", supportsMedia: false },
  pantry: { apiPath: "/api/pantrys", statusField: "pantryStatus", numberField: "numberPantry", supportsMedia: false },
};

function parseType(raw: string | null): RealEstateType {
  if (raw === "commerce" || raw === "parking" || raw === "pantry") return raw;
  return "property";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const type = parseType(request.nextUrl.searchParams.get("type"));
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (type !== "property") {
      const cfg = TYPE_CONFIG[type];
      const raw = await apiGet({
        path: cfg.apiPath,
        params: {
          "filters[documentId][$eq]": String(id),
          "filters[project][publishedAt][$notNull]": "true",
          "pagination[pageSize]": "1",
          "populate[project][fields][0]": "projectName",
          "populate[project][fields][1]": "district",
          "populate[project][fields][2]": "documentId",
          "populate[project][populate][complexes][fields][0]": "complexAddress",
          "populate[project][populate][complexes][fields][1]": "complexDueDate",
          "populate[paymentConditions][populate]": "paymentCondition",
          ...(cfg.supportsMedia ? {
            "populate[plan][fields][0]": "url",
            "populate[platformPlan][fields][0]": "url",
            "populate[windPlan][fields][0]": "url",
          } : {}),
        },
      }, true);
      const item = Array.isArray((raw as any)?.data) ? (raw as any).data[0] : null;
      if (!item) return NextResponse.json({ error: "Property not found" }, { status: 404 });
      const plan = Array.isArray(item?.plan) ? item.plan : item?.plan ? [item.plan] : [];
      const platform = Array.isArray(item?.platformPlan) ? item.platformPlan : item?.platformPlan ? [item.platformPlan] : [];
      const wind = Array.isArray(item?.windPlan) ? item.windPlan : item?.windPlan ? [item.windPlan] : [];
      const complexes = item?.project?.complexes;
      const complexAddress = Array.isArray(complexes)
        ? (complexes[0]?.complexAddress ?? "")
        : (complexes?.complexAddress ?? "");
      const complexDueDate = Array.isArray(complexes)
        ? (complexes[0]?.complexDueDate ?? "")
        : (complexes?.complexDueDate ?? "");
      const proj = item?.project as { documentId?: string; data?: { documentId?: string } } | undefined;
      const projectDocumentId =
        proj?.documentId != null
          ? String(proj.documentId)
          : proj?.data?.documentId != null
            ? String(proj.data.documentId)
            : undefined;
      return NextResponse.json({
        id: item.id,
        documentId: item.documentId,
        projectDocumentId,
        room: Number(item.room) || 0,
        house: Number(item.house) || 0,
        totalArea: Number(item.totalArea) || 0,
        priceCheckmate: Number(item.priceCheckmate) || 0,
        priceM2Checkmate: Number(item.priceM2Checkmate) || 0,
        floor: Number(item.floor) || 0,
        section: String(item.section ?? "0"),
        entrance: Number(item.entrance) || 0,
        projectName: item?.project?.projectName ?? "",
        district: item?.project?.district ?? "",
        complexAddress,
        complexDueDate,
        images: plan.map((p: any) => p?.url).filter(Boolean),
        platformPlanImages: platform.map((p: any) => p?.url).filter(Boolean),
        windPlanImages: wind.map((p: any) => p?.url).filter(Boolean),
        propertyStatus: item?.[cfg.statusField] ?? "свободно",
        apartmentNumber: item?.[cfg.numberField] ?? item?.id,
        saleStatus: item?.saleStatus,
        paymentConditions: item?.paymentConditions ?? [],
      });
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
