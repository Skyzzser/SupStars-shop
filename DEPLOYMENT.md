# Deployment notes

Netlify deploys only the Mini App frontend from `apps/web`. The backend API must be deployed separately to a public HTTPS host.

## Production env

Web / Netlify:

```env
NEXT_PUBLIC_API_URL=https://your-public-api.example.com
```

API:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
BOT_TOKEN=123456:real-token
WEB_APP_URL=https://your-mini-app.netlify.app
API_PUBLIC_URL=https://your-public-api.example.com
ADMIN_IDS=123456789,987654321
ADMIN_USERNAMES=admin_username
CORS_ORIGINS=https://your-mini-app.netlify.app,https://your-custom-domain.com
```

Bot:

```env
NODE_ENV=production
BOT_TOKEN=123456:real-token
WEB_APP_URL=https://your-mini-app.netlify.app
API_PUBLIC_URL=https://your-public-api.example.com
BOT_MODE=webhook
BOT_PUBLIC_URL=https://your-bot-service.onrender.com
BOT_WEBHOOK_PATH=/telegram/webhook
BOT_WEBHOOK_SECRET=replace-with-random-secret
```

`BOT_WEBHOOK_URL` is optional. Use it only when you want to override the full webhook URL manually. If it is empty, the bot builds it from `BOT_PUBLIC_URL + BOT_WEBHOOK_PATH`.

## Production database

Run this against the production database after deploy:

```bash
pnpm run db:deploy:render:api
```

The seed upserts both required active products:

- `Telegram Stars`
- `Telegram Premium`

## Render API service

Use the repository root as Render's root directory.

Build command:

```bash
pnpm run build:render:api
```

Start command:

```bash
pnpm --filter @suupstars/api start
```

Pre-deploy command:

```bash
pnpm run db:deploy:render:api
```

The Render build script installs the API workspace graph first, then builds `packages/shared`, runs `prisma generate`, and compiles `apps/api`.
The Render pre-deploy script installs the same workspace graph, runs `prisma migrate deploy`, and then runs the idempotent seed for `Telegram Stars` and `Telegram Premium`.

## Render Bot Web Service

Render free Web Services can sleep when they receive no HTTP traffic, so the production bot must run as a Web Service with Telegram webhook traffic instead of polling. Telegram will send updates to the public Render HTTPS URL and wake the service when users message the bot.

Use the repository root as Render's root directory.

Build command:

```bash
pnpm run build:render:bot
```

Start command:

```bash
pnpm run start:render:bot
```

Required env:

```env
NODE_ENV=production
BOT_TOKEN=123456:real-token
API_PUBLIC_URL=https://your-public-api.example.com
WEB_APP_URL=https://your-mini-app.netlify.app
BOT_MODE=webhook
BOT_PUBLIC_URL=https://your-bot-service.onrender.com
BOT_WEBHOOK_PATH=/telegram/webhook
BOT_WEBHOOK_SECRET=replace-with-random-secret
```

Render provides `PORT` automatically for Web Services. `BOT_PORT` is only a local fallback.

The webhook URL registered at startup will be:

```text
https://your-bot-service.onrender.com/telegram/webhook
```

Health endpoints stay available:

- `GET https://your-bot-service.onrender.com/`
- `GET https://your-bot-service.onrender.com/healthz`

Telegram updates are accepted only on:

- `POST https://your-bot-service.onrender.com/telegram/webhook`

## Check Render webhook

After the bot service deploys successfully:

1. Open `https://your-bot-service.onrender.com/healthz`; it should return `{ "status": "ok" }`.
2. Open `https://your-bot-service.onrender.com/`; it should show `service: bot`, `mode: webhook`, and `webhookPath: /telegram/webhook`.
3. Check Telegram webhook info:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

The `url` must be `https://your-bot-service.onrender.com/telegram/webhook`, and `last_error_message` should be empty.

4. Send `/start` to the bot in Telegram. Render logs should show the service handling requests, and the bot should answer without polling.

## Important

Do not use `localhost` in production `NEXT_PUBLIC_API_URL`, `API_PUBLIC_URL`, `WEB_APP_URL`, `BOT_PUBLIC_URL`, or `BOT_WEBHOOK_URL`.

If the Mini App is deployed with a localhost API URL, the browser will call the visitor's own machine and product loading/order creation will fail.
