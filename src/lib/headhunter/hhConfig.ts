/**
 * Секреты и ключи — только в server-side env (без префикса NEXT_PUBLIC).
 * @see https://dev.hh.ru
 * Redirect URI в кабинете и в `HH_OAUTH_REDIRECT_URI` должны совпадать 1:1
 * (например `https://galamat.kz/api/hh-oauth/callback`).
 */
export function getHhConfig() {
  return {
    userAgent: process.env.HH_USER_AGENT?.trim(),
    clientId: process.env.HH_CLIENT_ID?.trim(),
    clientSecret: process.env.HH_CLIENT_SECRET?.trim(),
    oauthRedirectUri: process.env.HH_OAUTH_REDIRECT_URI?.trim(),
    refreshToken: process.env.HH_REFRESH_TOKEN?.trim(),
    accessToken: process.env.HH_ACCESS_TOKEN?.trim(),
    accessTokenExpiresAt: process.env.HH_ACCESS_TOKEN_EXPIRES_AT?.trim(),
    employerId: process.env.HH_EMPLOYER_ID?.trim(),
    apiBase: (process.env.HH_API_BASE || "https://api.hh.ru").replace(/\/$/, ""),
    oauthTokenUrl: process.env.HH_OAUTH_TOKEN_URL || "https://api.hh.ru/token",
  };
}
