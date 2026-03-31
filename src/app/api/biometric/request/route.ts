import { NextResponse } from "next/server";
import { mapBiometricError } from "@/lib/biometricErrors";

const BIOMETRIC_BASE = "https://kyc.biometric.kz/api/v1/backend/e-document/online-access";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.BIOMETRIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", message: "BIOMETRIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { iin, phone } = body as { iin?: string; phone?: string };

    if (!iin || !phone) {
      return NextResponse.json(
        { status: "error", message: "iin and phone are required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${BIOMETRIC_BASE}/request/identity_card/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          iin: String(iin).trim(),
          phone: String(phone).trim(),
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const mapped = mapBiometricError(res.status, data);
      return NextResponse.json(
        {
          status: "error",
          code: mapped.code,
          message: mapped.message,
        },
        { status: mapped.status }
      );
    }

    const backendSessionId = data?.backend_session_id ?? data?.backendSessionId;
    if (!backendSessionId) {
      return NextResponse.json(
        { status: "error", message: "No backend_session_id in response" },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: "ok", backend_session_id: backendSessionId });
  } catch (e) {
    console.error("Biometric request error:", e);
    return NextResponse.json(
      { status: "error", message: "server_error" },
      { status: 500 }
    );
  }
}
