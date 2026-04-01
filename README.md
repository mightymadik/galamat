# Galamat Frontend

Next.js frontend for Galamat, configured for local/dev run on `http://localhost:3000`.

## Local Run

1. Create env from example:
   - `cp .env.example .env`
2. Install deps:
   - `npm install`
3. Start dev server:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

`npm run dev` starts Next.js on port `3000` (`next dev -p 3000`).

## API and nginx/docker scheme

- Browser REST calls should go to relative `/api` (same-origin).
- Next.js API routes proxy queue calls to backend using `QUEUE_API_URL` (server-side env).

Example nginx fragment:

```nginx
location / {
  proxy_pass http://frontend:3000;
}

location /api/ {
  proxy_pass http://frontend:3000/api/;
}

location /socket.io/ {
  proxy_pass http://queue-backend:3001/socket.io/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

## Socket behavior (same-origin by default)

- By default frontend socket uses current origin (no explicit host), so behind nginx it works as same-origin.
- To override socket endpoint explicitly, set one of:
  - `NEXT_PUBLIC_QUEUE_API_URL=https://your-socket-host`
  - or `VITE_SOCKET_URL=https://your-socket-host` (backward-compatible fallback)

## Локальный env (docker + nginx)

Готовый пример для `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# server-only (читается Next.js API routes на сервере)
QUEUE_API_URL=http://queue-backend:3001
QUEUE_BACKEND_URL=http://queue-backend:3001

# public/browser (доступно в клиентском бандле)
# пусто = same-origin socket через nginx (http://localhost:3000/socket.io)
NEXT_PUBLIC_QUEUE_API_URL=

# legacy fallback (если исторически использовался Vite-style ключ)
VITE_SOCKET_URL=
```

- `QUEUE_API_URL` и `QUEUE_BACKEND_URL` — server-only переменные, используются в Next.js route handlers для запросов к queue backend внутри docker сети.
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_QUEUE_API_URL`, `VITE_SOCKET_URL` — public/browser переменные.
- `NEXT_PUBLIC_QUEUE_API_URL=http://localhost:3001` нужно задавать только если запускаете фронт без nginx и хотите подключаться к socket backend напрямую.

## QR/display links examples

- Queue display page:
  - `http://localhost:3000/profile/queue`
- Frontend base for QR/open links:
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
