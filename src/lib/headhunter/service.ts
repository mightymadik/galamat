import type {
  HhOAuthTokenResponse,
  HhVacanciesResponse,
  HhVacancyListItem,
  PublicVacancyCard,
  HeadHunterListParams,
} from "./types";
import { getHhConfig } from "./hhConfig";

const API_TIMEOUT_MS = 12_000;
const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const DEFAULT_HH_HOST = "hh.kz";

type CachedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

let cached: CachedTokens | null = null;
let refreshInFlight: Promise<CachedTokens | null> | null = null;

function parseExpiresAtToMs(value?: string): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) {
    // Accept both absolute timestamps and ttl/expires_in seconds.
    if (asNumber <= 0) return null;
    if (asNumber < 100_000_000) return Date.now() + asNumber * 1000;
    return asNumber < 10_000_000_000 ? asNumber * 1000 : asNumber;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function getInitialTokensFromEnv(): CachedTokens | null {
  const cfg = getHhConfig();
  const accessToken = cfg.accessToken?.trim();
  const refreshToken = cfg.refreshToken?.trim();
  if (!accessToken || !refreshToken) return null;
  const now = Date.now();
  const expiresAt = parseExpiresAtToMs(cfg.accessTokenExpiresAt) ?? now + 5 * 60_000;
  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

function getUserAgent(): string {
  return getHhConfig().userAgent || "Galamat-Next-1.0";
}

function userAgentForOAuthRequest(): string {
  return getHhConfig().userAgent || "Galamat-Next-1.0";
}

function formEncode(body: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== "") p.set(k, v);
  }
  return p.toString();
}

/**
 * OAuth: code → access + refresh. После — сохранить `refresh_token` в `HH_REFRESH_TOKEN`.
 */
export async function exchangeAuthorizationCode(
  authorizationCode: string,
  redirectUri?: string
): Promise<HhOAuthTokenResponse> {
  const { clientId, clientSecret, oauthRedirectUri, oauthTokenUrl } = getHhConfig();
  if (!clientId || !clientSecret) {
    throw new Error("HH_CLIENT_ID and HH_CLIENT_SECRET are required for token exchange");
  }
  const redirect = redirectUri?.trim() ?? oauthRedirectUri;
  const bodyFields: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: authorizationCode,
  };
  if (redirect) {
    bodyFields.redirect_uri = redirect;
  }
  const body = formEncode(bodyFields);
  const res = await fetchWithTimeout(
    oauthTokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgentForOAuthRequest(),
      },
      body,
    },
    API_TIMEOUT_MS
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("[headhunter] OAuth code exchange failed", res.status, text.slice(0, 500));
    throw new Error(`HeadHunter token error: ${res.status}`);
  }
  return JSON.parse(text) as HhOAuthTokenResponse;
}

async function refreshWithRefreshToken(refreshToken: string): Promise<CachedTokens> {
  const { clientId, clientSecret, oauthTokenUrl } = getHhConfig();
  if (!clientId || !clientSecret) {
    throw new Error("HH_CLIENT_ID and HH_CLIENT_SECRET are required to refresh");
  }
  const body = formEncode({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetchWithTimeout(
    oauthTokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgentForOAuthRequest(),
      },
      body,
    },
    API_TIMEOUT_MS
  );
  const text = await res.text();
  if (!res.ok) {
    console.error("[headhunter] OAuth refresh failed", res.status, text.slice(0, 500));
    throw new Error(`HeadHunter refresh error: ${res.status}`);
  }
  const data = JSON.parse(text) as HhOAuthTokenResponse;
  const newRefresh = data.refresh_token?.trim() || refreshToken;
  const now = Date.now();
  const expiresInMs = (data.expires_in ?? 0) * 1000;
  return {
    accessToken: data.access_token,
    refreshToken: newRefresh,
    expiresAt: now + (expiresInMs > 0 ? expiresInMs : 3_600_000),
  };
}

export async function getValidAccessToken(): Promise<string | null> {
  if (!cached) {
    cached = getInitialTokensFromEnv();
  }
  if (!cached) {
    return null;
  }
  const isExpired = Date.now() >= cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  if (!isExpired) return cached.accessToken;

  const refreshToken = cached.refreshToken;
  if (!refreshToken) return null;

  if (refreshInFlight) {
    const inFlight = await refreshInFlight;
    return inFlight?.accessToken ?? null;
  }

  refreshInFlight = (async (): Promise<CachedTokens | null> => {
    try {
      const next = await refreshWithRefreshToken(refreshToken);
      if (next.refreshToken !== refreshToken) {
        console.info(
          "[headhunter] new refresh_token issued; update HH_REFRESH_TOKEN and HH_ACCESS_TOKEN in env"
        );
      }
      cached = next;
      return next;
    } catch (e) {
      console.error(
        "[headhunter] getValidAccessToken failed",
        e instanceof Error ? e.message : String(e)
      );
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  const c = await refreshInFlight;
  return c?.accessToken ?? null;
}

function formatAddress(v: HhVacancyListItem): string {
  if (v.address?.raw) return v.address.raw;
  const parts = [v.address?.city, v.address?.street, v.address?.building].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (v.area?.name) return v.area.name;
  return "—";
}

function mapToPublic(v: HhVacancyListItem): PublicVacancyCard {
  return {
    id: String(v.id),
    title: v.name,
    address: formatAddress(v),
    link: v.alternate_url?.trim() || `https://hh.ru/vacancy/${v.id}`,
  };
}

export function isHeadHunterApiReady(): boolean {
  const cfg = getHhConfig();
  return Boolean(
    cfg.userAgent && cfg.clientId && cfg.clientSecret && cfg.refreshToken && cfg.accessToken
  );
}

export async function fetchVacanciesFromHh(
  params: HeadHunterListParams
): Promise<{ raw: HhVacanciesResponse; items: PublicVacancyCard[] }> {
  const cfg = getHhConfig();
  const u = new URL(`${cfg.apiBase}/vacancies`);
  const employer = params.employerId?.trim() ?? cfg.employerId;
  if (employer) u.searchParams.set("employer_id", employer);
  if (params.text?.trim()) u.searchParams.set("text", params.text.trim());
  if (params.area?.trim()) u.searchParams.set("area", params.area.trim());
  const page = params.page ?? 0;
  const perPage = Math.min(Math.max(params.perPage ?? 20, 1), 100);
  u.searchParams.set("host", DEFAULT_HH_HOST);
  u.searchParams.set("page", String(page));
  u.searchParams.set("per_page", String(perPage));

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("HeadHunter auth is not ready: set HH_ACCESS_TOKEN/HH_REFRESH_TOKEN/expires");
  }

  const res = await fetchWithTimeout(
    u.toString(),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "HH-User-Agent": getUserAgent(),
        Accept: "application/json",
      },
    },
    API_TIMEOUT_MS
  );
  const text = await res.text();

  if (!res.ok) {
    console.error(
      "[headhunter] vacancies",
      res.status,
      u.toString().split("?")[0],
      text.slice(0, 400)
    );
    throw new Error(`HeadHunter API error: ${res.status}`);
  }
  const raw = JSON.parse(text) as HhVacanciesResponse;
  const items = (raw.items ?? []).map(mapToPublic);
  return { raw, items };
}
