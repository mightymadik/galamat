import { NextResponse } from "next/server";
import { getStrapiBaseUrl, getStrapiHeaders } from "@/lib/strapiServer";
import axios from "axios";

export async function GET() {
  try {
    const baseUrl = getStrapiBaseUrl();
    const headers = getStrapiHeaders();

    const res = await axios.get(`${baseUrl}/api/probability`, {
      headers,
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.status !== 200) {
      return NextResponse.json(
        { error: "Failed to fetch probability" },
        { status: res.status }
      );
    }
    return NextResponse.json(res.data);
  } catch (e) {
    console.error("Probability fetch error:", e);
    return NextResponse.json(
      { error: "Failed to fetch probability" },
      { status: 500 }
    );
  }
}
