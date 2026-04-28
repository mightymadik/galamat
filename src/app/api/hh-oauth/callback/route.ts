import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode, getHhConfig } from "@/lib/headhunter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error")?.trim();
  const errorDescription = request.nextUrl.searchParams.get("error_description")?.trim();
  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (error) {
    console.error("[api/hh-oauth/callback] provider returned error", {
      error,
      errorDescription,
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { clientId, clientSecret, oauthRedirectUri } = getHhConfig();
  if (!clientId || !clientSecret || !oauthRedirectUri) {
    console.error("[api/hh-oauth/callback] missing required HH_* env vars");
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, oauthRedirectUri);

    // OAuth callback is backend-only now; refresh token is emitted to server logs for ops update.
    if (tokens.refresh_token) {
      console.info(
        "[api/hh-oauth/callback] new HH_REFRESH_TOKEN received. Update server secret:",
        tokens.refresh_token
      );
    }
  } catch (e) {
    console.error(
      "[api/hh-oauth/callback] failed to exchange code",
      e instanceof Error ? e.message : String(e)
    );
  }

  return NextResponse.redirect(new URL("/", request.url));
}
