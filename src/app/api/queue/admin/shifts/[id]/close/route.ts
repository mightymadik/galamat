import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queueBackendUrl, requireAdminAccessToken } from "@/lib/queueAdminAuth";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "shift_id_required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const auth = requireAdminAccessToken(cookieStore);
  if ("response" in auth) return auth.response;

  try {
    const res = await fetch(
      queueBackendUrl(`/api/admin/shifts/${encodeURIComponent(id)}/close`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.access}`,
          "Content-Type": "application/json",
        },
      },
    );
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    console.error("[queue/admin/shifts/close]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
