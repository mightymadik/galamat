import { NextRequest, NextResponse } from "next/server";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";
import axios from "axios";

const baseUrl = () => getStrapiBaseUrl();
const headers = () => getStrapiHeaders();

/** GET /api/galaBonus/bonuses?documentId=xxx - list gala-bonuses for user, newest first */
export async function GET(request: NextRequest) {
  try {
    const documentId = request.nextUrl.searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }
    const url = `${baseUrl()}/api/gala-bonuses?filters[user][documentId][$eq]=${encodeURIComponent(documentId)}&sort[0]=updatedAt:desc&pagination[pageSize]=25`;
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

/** POST /api/galaBonus/bonuses - create gala-bonus (prize claimed) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, prize } = body as { documentId?: string; prize?: string | number };
    if (!documentId || documentId.trim() === "") {
      return NextResponse.json(
        { error: "documentId required" },
        { status: 400 }
      );
    }
    const prizeStr = prize != null ? String(prize) : "";
    const prizeDigits = prizeStr.replace(/\D/g, "") || "0";
    const url = `${baseUrl()}/api/gala-bonuses`;
    const res = await axios.post(
      url,
      { data: { user: documentId, prize: prizeDigits, active: true } },
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
    return NextResponse.json(res.data);
  } catch (e) {
    console.error("Bonuses create error:", e);
    return NextResponse.json(
      { error: "Failed to create bonus" },
      { status: 500 }
    );
  }
}
