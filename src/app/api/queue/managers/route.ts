import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUEUE_API_URL =
  process.env.QUEUE_API_URL || process.env.QUEUE_BACKEND_URL || "http://queue-backend:3001";

type ManagerItemRaw = {
  id?: string;
  documentId?: string;
  fullName?: string;
  name?: string;
  surname?: string;
  middlename?: string;
  attributes?: {
    fullName?: string;
    name?: string;
    surname?: string;
    middlename?: string;
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
  const serviceId = searchParams.get("serviceId") || "";

  if (!branchId) {
    return NextResponse.json({ error: "branchId_required" }, { status: 400 });
  }

  try {
    const url = new URL("/api/managers", QUEUE_API_URL);
    url.searchParams.set("branchId", branchId);
    if (serviceId) {
      url.searchParams.set("serviceId", serviceId);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(json || { error: "queue_error" }, { status: res.status });
    }

    const list = ((json as { data?: unknown[] })?.data ?? []) as Array<
      ManagerItemRaw & { status?: string }
    >;

    const managers = list
      .map((item) => {
        const a = (item.attributes ?? item) as ManagerItemRaw;
        const id = String(item.documentId ?? item.id ?? "");
        const fullName =
          a?.fullName ??
          [a?.surname, a?.name, a?.middlename].filter(Boolean).join(" ").trim() ??
          "";
        const name = fullName || String(a?.name ?? "") || id;
        const status = String(item.status ?? "OFFLINE");
        return { id, name, shortName: a?.name ?? "", status };
      })
      .filter((m) => m.status !== "OFFLINE");
    return NextResponse.json(
      { managers },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (e) {
    console.error("[queue/managers]", e);
    return NextResponse.json({ error: "queue_unavailable" }, { status: 502 });
  }
}

