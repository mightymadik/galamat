import { NextRequest, NextResponse } from "next/server";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";
import axios from "axios";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/tokens";

const baseUrl = () => getStrapiBaseUrl();
const headers = () => getStrapiHeaders();

async function resolveAuthorizedCustomerDocumentId(): Promise<string | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return null;

  const payload = verifyAccessToken(access);
  if (!payload?.sub) return null;

  if (payload.documentId && String(payload.documentId).trim() !== "") {
    return String(payload.documentId).trim();
  }

  try {
    const base = baseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
    const meRes = await axios.get(
      `${base}/api/customers?filters[id][$eq]=${encodeURIComponent(
        String(payload.sub)
      )}&pagination[pageSize]=1&fields[0]=documentId`,
      { headers: headers(), timeout: 10000, validateStatus: () => true }
    );
    if (meRes.status !== 200) return null;
    const me = meRes.data?.data?.[0];
    const documentId = me?.documentId ?? me?.attributes?.documentId ?? null;
    if (documentId == null) return null;
    return String(documentId).trim() || null;
  } catch {
    return null;
  }
}

/** GET /api/galaBonus/bonuses - list current user's gala-bonuses, newest first */
export async function GET(request: NextRequest) {
  try {
    const authorizedDocumentId = await resolveAuthorizedCustomerDocumentId();
    if (!authorizedDocumentId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const requestedDocumentId = request.nextUrl.searchParams.get("documentId")?.trim();
    if (requestedDocumentId && requestedDocumentId !== authorizedDocumentId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const url = `${baseUrl()}/api/gala-bonuses?filters[user][documentId][$eq]=${encodeURIComponent(authorizedDocumentId)}&sort[0]=updatedAt:desc&pagination[pageSize]=25`;
    const res = await axios.get(url, {
      headers: headers(),
      timeout: 10000,
      validateStatus: () => true,
    });
    if (res.status !== 200) {
      return NextResponse.json(
        { error: "Failed to fetch bonuses" },
        { status: res.status }
      );
    }
    return NextResponse.json(res.data);
  } catch (e) {
    console.error("Bonuses fetch error:", e);
    return NextResponse.json(
      { error: "Failed to fetch bonuses" },
      { status: 500 }
    );
  }
}

/** POST /api/galaBonus/bonuses - create gala-bonus for current user (prize claimed) */
export async function POST(request: NextRequest) {
  try {
    const authorizedDocumentId = await resolveAuthorizedCustomerDocumentId();
    if (!authorizedDocumentId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, prize } = body as { documentId?: string; prize?: string | number };
    const requestedDocumentId = documentId?.trim();
    if (requestedDocumentId && requestedDocumentId !== authorizedDocumentId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const prizeStr = prize != null ? String(prize) : "";
    const prizeDigits = prizeStr.replace(/\D/g, "") || "0";

    const activeCheckUrl =
      `${baseUrl()}/api/gala-bonuses` +
      `?filters[user][documentId][$eq]=${encodeURIComponent(authorizedDocumentId)}` +
      `&filters[active][$eq]=true&sort[0]=updatedAt:desc&pagination[pageSize]=100`;
    const activeCheckRes = await axios.get(activeCheckUrl, {
      headers: headers(),
      timeout: 10000,
      validateStatus: () => true,
    });
    if (activeCheckRes.status !== 200) {
      return NextResponse.json(
        { error: "Failed to validate active bonus state" },
        { status: activeCheckRes.status }
      );
    }
    const existingActive = Array.isArray(activeCheckRes.data?.data) ? activeCheckRes.data.data : [];
    if (existingActive.length > 0) {
      return NextResponse.json(
        { error: "active_bonus_exists", message: "У вас уже есть неиспользованный бонус" },
        { status: 409 }
      );
    }

    const createUrl = `${baseUrl()}/api/gala-bonuses`;
    const res = await axios.post(
      createUrl,
      { data: { user: authorizedDocumentId, prize: prizeDigits, active: true } },
      {
        headers: headers(),
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    if (res.status !== 200 && res.status !== 201) {
      let message = "Failed to create bonus";
      const err = res.data?.error;
      if (err && typeof err.message === "string") message = err.message;
      else if (typeof err === "string") message = err;
      else if (Array.isArray(err))
        message = err.map((e: any) => e?.message).filter(Boolean).join(" ") || message;
      return NextResponse.json(
        { error: message },
        { status: res.status }
      );
    }
    // Best-effort dedupe: if race condition created duplicates, keep only the newest active.
    try {
      const afterCreateRes = await axios.get(activeCheckUrl, {
        headers: headers(),
        timeout: 10000,
        validateStatus: () => true,
      });
      if (afterCreateRes.status === 200) {
        const activeList: any[] = Array.isArray(afterCreateRes.data?.data) ? afterCreateRes.data.data : [];
        if (activeList.length > 1) {
          const [, ...duplicates] = activeList;
          await Promise.all(
            duplicates.map((item) => {
              const key = item?.documentId ?? item?.id;
              if (!key) return Promise.resolve();
              return axios.put(
                `${baseUrl()}/api/gala-bonuses/${encodeURIComponent(String(key))}`,
                { data: { active: false } },
                { headers: headers(), timeout: 10000, validateStatus: () => true }
              );
            })
          );
        }
      }
    } catch (e) {
      console.error("Bonuses dedupe warning:", e);
    }

    return NextResponse.json(res.data);
  } catch (e) {
    console.error("Bonuses create error:", e);
    return NextResponse.json(
      { error: "Failed to create bonus" },
      { status: 500 }
    );
  }
}
