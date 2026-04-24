import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";
import { getStrapiBaseUrl, getStrapiHeaders, strapiAxios } from "@/lib/strapiServer";
import { resolveEffectiveRole } from "@/lib/dealManagerAuth";

const ALLOWED_STATUSES = new Set([
  "Зарегистрировано",
  "Отказано",
  "Не отправлено",
]);

/**
 * POST /api/deals/[documentId]/kazreestr-status
 * Body: { status: "Зарегистрировано" | "Отказано" | "Не отправлено" }
 * Позволяет юристу (lawyer) или администратору вручную проставить статус Казреестра.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(access);
    if (!payload?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { documentId } = await params;
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const status = String((body as { status?: string })?.status ?? "").trim();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "status must be one of: Зарегистрировано, Отказано, Не отправлено" },
        { status: 400 }
      );
    }

    const base = getStrapiBaseUrl().replace(/\/$/, "");
    const rootBase = base.replace(/\/api\/?$/, "");
    const headers = getStrapiHeaders();
    const effectiveRole = await resolveEffectiveRole(payload, rootBase, headers);
    const roleLower = String(effectiveRole ?? "").toLowerCase();
    if (roleLower !== "lawyer" && roleLower !== "admin" && roleLower !== "rop") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = { kazreestrStatus: status };
    if (status === "Зарегистрировано") {
      data.kazreestrRegisteredAt = new Date().toISOString();
      data.kazreestrError = null;
    } else if (status === "Отказано") {
      data.kazreestrError = null;
    } else if (status === "Не отправлено") {
      data.kazreestrRegisteredAt = null;
      data.kazreestrError = null;
    }

    await strapiAxios.put(
      `${base}/api/deals/${encodeURIComponent(documentId)}`,
      { data },
      { headers }
    );

    return NextResponse.json({ ok: true, kazreestrStatus: status });
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const msg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? "server_error";
    console.error("[deals/kazreestr-status]", status, msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
