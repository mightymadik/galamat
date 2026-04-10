#!/usr/bin/env bash
# Проверка: прямой URL Strapi /uploads/... не отдаёт файл без авторизации (ожидается 403/401 после блокировки nginx).
# Использование:
#   STRAPI_PUBLIC_URL=https://api.example.com ./scripts/verify-uploads-proxy-only.sh /uploads/test.pdf
#
set -euo pipefail
BASE="${STRAPI_PUBLIC_URL:-}"
PATHPART="${1:-}"
if [[ -z "$BASE" || -z "$PATHPART" ]]; then
  echo "Usage: STRAPI_PUBLIC_URL=http://host.docker.internal:1337 $0 /uploads/your.pdf" >&2
  exit 1
fi
URL="${BASE%/}${PATHPART}"
code="$(curl -sS -o /dev/null -w "%{http_code}" "$URL" || true)"
echo "GET $URL -> HTTP $code (ожидайте не 200 после блокировки прямого доступа)"
