import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

const KIND_TO_PATH: Record<string, string> = {
  "manager-sessions": "/api/admin/stats/export/manager-sessions",
  clients: "/api/admin/stats/export/clients",
  "manager-status-actions": "/api/admin/stats/export/manager-status-actions",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ kind: string }> },
) {
  const { kind } = await context.params;
  const backendPath = KIND_TO_PATH[kind];
  if (!backendPath) {
    return NextResponse.json({ error: "invalid_export_kind" }, { status: 400 });
  }

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

  const url = new URL(backendPath, QUEUE_API_URL);
  if (branchId) url.searchParams.set("branchId", branchId);
  if (startDate) url.searchParams.set("startDate", startDate);
  if (endDate) url.searchParams.set("endDate", endDate);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return NextResponse.json(errJson || { error: "export_failed" }, { status: res.status });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const ct =
      res.headers.get("Content-Type") ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const cd = res.headers.get("Content-Disposition") || "";

    const headers = new Headers();
    headers.set("Content-Type", ct);
    if (cd) {
      headers.set("Content-Disposition", cd);
    }

    return new NextResponse(buf, { status: 200, headers });
  } catch (e) {
    console.error("[queue/stats/export]", e);
    return NextResponse.json({ error: "export_unavailable" }, { status: 502 });
  }
}
