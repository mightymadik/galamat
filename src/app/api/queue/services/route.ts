import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type ServiceItemRaw = {
  id?: string;
  documentId?: string;
  name?: string;
  attributes?: {
    name?: string;
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

  if (!branchId) {
    return NextResponse.json({ error: "branchId_required" }, { status: 400 });
  }

  try {
    const url = new URL("/api/services", QUEUE_API_URL);
    url.searchParams.set("branchId", branchId);
    url.searchParams.set("isActive", "true");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(json || { error: "queue_error" }, { status: res.status });
    }

    const list = ((json as any)?.data ?? []) as ServiceItemRaw[];

    const services = list.map((item) => {
      const attrs = item.attributes ?? (item as any);
      const id = String(item.documentId ?? item.id ?? "");
      const name = String(attrs?.name ?? "");
      return { id, name };
    });

    return NextResponse.json({ services }, { status: 200 });
  } catch (e) {
    console.error("[queue/services]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

