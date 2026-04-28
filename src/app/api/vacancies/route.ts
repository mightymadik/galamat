import { NextRequest, NextResponse } from "next/server";
import {
  fetchVacanciesFromHh,
  isHeadHunterApiReady,
  getHhConfig,
} from "@/lib/headhunter";

/**
 * GET /api/vacancies
 * Прокси к https://api.hh.ru/vacancies (см. .env: HH_*, без NEXT_PUBLIC).
 * Query: employer_id, page, per_page, text, area
 */
export async function GET(request: NextRequest) {
  if (!isHeadHunterApiReady()) {
    return NextResponse.json({
      success: true,
      data: { items: [], found: 0, page: 0, perPage: 0, pages: 0 },
      meta: {
        configured: false,
        message:
          "Set HH_USER_AGENT, HH_CLIENT_ID, HH_CLIENT_SECRET, HH_ACCESS_TOKEN, HH_REFRESH_TOKEN and HH_ACCESS_TOKEN_EXPIRES_AT in .env",
      },
    });
  }

  const employerId = request.nextUrl.searchParams.get("employer_id")?.trim();
  if (!employerId && !getHhConfig().employerId) {
    return NextResponse.json({
      success: true,
      data: { items: [], found: 0, page: 0, perPage: 0, pages: 0 },
      meta: {
        configured: true,
        needEmployer: true,
        message: "Set HH_EMPLOYER_ID or pass employer_id query",
      },
    });
  }

  const page = request.nextUrl.searchParams.has("page")
    ? parseInt(request.nextUrl.searchParams.get("page")!, 10)
    : 0;
  const perPage = request.nextUrl.searchParams.has("per_page")
    ? parseInt(request.nextUrl.searchParams.get("per_page")!, 10)
    : 20;
  if (Number.isNaN(page) || page < 0) {
    return NextResponse.json({ success: false, error: "Invalid page" }, { status: 400 });
  }
  if (Number.isNaN(perPage) || perPage < 1) {
    return NextResponse.json({ success: false, error: "Invalid per_page" }, { status: 400 });
  }

  const text = request.nextUrl.searchParams.get("text")?.trim();
  const area = request.nextUrl.searchParams.get("area")?.trim();

  try {
    const { raw, items } = await fetchVacanciesFromHh({
      employerId: employerId || undefined,
      page,
      perPage,
      text,
      area,
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        found: raw.found ?? items.length,
        page: raw.page ?? page,
        perPage: raw.per_page ?? perPage,
        pages: raw.pages ?? 0,
      },
      meta: { configured: true, source: "headhunter" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV === "development") {
      console.error("[api/vacancies]", msg);
    }
    return NextResponse.json(
      { success: false, error: "HeadHunter API unavailable" },
      { status: 502 }
    );
  }
}
