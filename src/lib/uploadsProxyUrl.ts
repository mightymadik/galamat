/**
 * Файлы Strapi /uploads отдаём через GET /api/media/file?path=… (нужен вход: cookie access_token).
 * Опционально name= для имени во вкладке браузера.
 */

export const MEDIA_FILE_API_PATH = "/api/media/file";

export function strapiPublicOrigin(): string {
  const base = process.env.STRAPI_URL ?? "";
  return base.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function uploadsPathToMediaFileUrl(path: string, name?: string): string {
  const q = new URLSearchParams({ path });
  const n = name?.trim();
  if (n) q.set("name", n);
  return `${MEDIA_FILE_API_PATH}?${q.toString()}`;
}

/** Переписать URL Strapi /uploads на прокси фронта. Прочие URL не трогаем. */
export function toClientMediaUrl(rawUrl: string, name?: string): string {
  const origin = strapiPublicOrigin();
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;

  if (rawUrl.startsWith("http")) {
    try {
      const u = new URL(rawUrl);
      const path = u.pathname;
      if (!path.startsWith("/uploads/")) return rawUrl;
      if (u.origin !== origin && !rawUrl.startsWith(origin)) return rawUrl;
      return uploadsPathToMediaFileUrl(path, name);
    } catch {
      return rawUrl;
    }
  }

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (path.startsWith("/uploads/")) return uploadsPathToMediaFileUrl(path, name);
  return `${origin}${path}`;
}

/** Для server-side fetch: относительный путь → абсолютный URL текущего origin. */
export function absoluteAppUrlFromRequest(req: Request, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const u = new URL(req.url);
  return `${u.origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
