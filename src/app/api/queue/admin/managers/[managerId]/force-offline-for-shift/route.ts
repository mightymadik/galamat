import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queueBackendUrl, requireAdminAccessToken } from "@/lib/queueAdminAuth";
import { verifyAccessToken } from "@/lib/tokens";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ managerId: string }> },
) {
  const { managerId } = await context.params;
  if (!managerId?.trim()) {
    return NextResponse.json({ error: "manager_id_required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const auth = requireAdminAccessToken(cookieStore);
  if ("response" in auth) return auth.response;

  console.log("Access data", verifyAccessToken(auth.access as string))
  
  try {
    if (managerId === verifyAccessToken(auth.access as string)?.documentId) {
      return NextResponse.json(
        { error: "Вы не можете закрыть смену самого себя" },
        { status: 400 }
      );
    }
    const res = await fetch(
      queueBackendUrl(
        `/api/admin/managers/${encodeURIComponent(managerId)}/force-offline-for-shift`,
      ),
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
    console.error("[queue/admin/managers/force-offline-for-shift]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}
