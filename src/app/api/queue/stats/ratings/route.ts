import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type RatingStatsBackendResponse = {
  success?: boolean;
  data?: {
    total: number;
    avgScore: number;
    distribution: Record<string, number>;
  };
};

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;

  if (!access) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = verifyAccessToken(access as string);
  if (!payload?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  try {
    const url = new URL("/api/ratings/stats", QUEUE_API_URL);
    if (branchId) {
      url.searchParams.set("branchId", branchId);
    }
    if (startDate) {
      url.searchParams.set("startDate", startDate);
    }
    if (endDate) {
      url.searchParams.set("endDate", endDate);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    });
    const json = (await res.json().catch(() => ({}))) as RatingStatsBackendResponse;

    if (!res.ok || !json?.data) {
      return NextResponse.json(json || { error: "rating_stats_error" }, { status: res.status || 502 });
    }

    return NextResponse.json({ ratings: json.data }, { status: 200 });
  } catch (e) {
    console.error("[queue/stats/ratings]", e);
    return NextResponse.json({ error: "rating_stats_unavailable" }, { status: 502 });
  }
}
