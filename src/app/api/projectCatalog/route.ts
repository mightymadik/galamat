import { NextResponse } from "next/server";
import { getProjectsDetails, ProjectFilters } from "./getProjectsDetail";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Получаем cookies из заголовков запроса
    const cookieHeader = req.headers.get("cookie") || "";
    
    const filters: ProjectFilters = {};
    
    // Парсим параметры фильтров из query string
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const pricePerM2Min = searchParams.get("pricePerM2Min");
    const pricePerM2Max = searchParams.get("pricePerM2Max");
    const areaMin = searchParams.get("areaMin");
    const areaMax = searchParams.get("areaMax");
    const rooms = searchParams.getAll("rooms"); // Получаем все значения для множественного выбора
    const district = searchParams.get("district");
    const complex = searchParams.get("complex");
    const category = searchParams.get("category");

    if (priceMin) filters.priceMin = Number(priceMin);
    if (priceMax) filters.priceMax = Number(priceMax);
    if (pricePerM2Min) filters.pricePerM2Min = Number(pricePerM2Min);
    if (pricePerM2Max) filters.pricePerM2Max = Number(pricePerM2Max);
    if (areaMin) filters.areaMin = Number(areaMin);
    if (areaMax) filters.areaMax = Number(areaMax);
    if (rooms.length > 0) filters.rooms = rooms; // Теперь это массив
    if (district && district !== "Все") filters.district = district;
    if (complex && complex !== "Все") filters.complex = complex;
    if (category) filters.category = category;

    const projects = await getProjectsDetails(undefined, filters, cookieHeader);
    
    return NextResponse.json({ data: projects });
  } catch (err: any) {
    console.error("Error fetching projects:", err);
    console.error("Error stack:", err.stack);
    return NextResponse.json(
      { 
        error: err.message || "Failed to fetch projects",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
