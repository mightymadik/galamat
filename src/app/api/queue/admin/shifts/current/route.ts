import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queueBackendUrl, requireAdminAccessToken } from "@/lib/queueAdminAuth";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = requireAdminAccessToken(cookieStore);
  if ("response" in auth) return auth.response;

  const branchId = new URL(req.url).searchParams.get("branchId")?.trim();
  if (!branchId) {
    return NextResponse.json({ error: "branchId_required" }, { status: 400 });
  }

  const url = new URL(queueBackendUrl("/api/admin/shifts/current"));
  url.searchParams.set("branchId", branchId);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[queue/admin/shifts/current]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
