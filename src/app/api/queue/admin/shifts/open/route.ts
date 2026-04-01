import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queueBackendUrl, requireAdminAccessToken } from "@/lib/queueAdminAuth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = requireAdminAccessToken(cookieStore);
  if ("response" in auth) return auth.response;

  let body: { branchId?: string } = {};
  try {
    body = (await req.json()) as { branchId?: string };
  } catch {
    // ignore
  }
  if (!body.branchId?.trim()) {
    return NextResponse.json({ error: "branchId_required" }, { status: 400 });
  }

  try {
    const res = await fetch(queueBackendUrl("/api/admin/shifts/open"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branchId: body.branchId.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[queue/admin/shifts/open]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
