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
CORS_ORIGINS=https://your-mini-app.netlify.app,https://your-custom-domain.com
```

Bot:

```env
NODE_ENV=production
BOT_TOKEN=123456:real-token
WEB_APP_URL=https://your-mini-app.netlify.app
API_PUBLIC_URL=https://your-public-api.example.com
BOT_MODE=polling
```

Use `BOT_MODE=webhook` only when the bot runtime has a public webhook URL.

## Production database

Run this against the production database after deploy:

```bash
pnpm --filter @suupstars/api prisma:deploy
pnpm --filter @suupstars/api prisma:seed
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

The Render build script installs the API workspace graph first, then builds `packages/shared`, runs `prisma generate`, and compiles `apps/api`.

## Important

Do not use `localhost` in production `NEXT_PUBLIC_API_URL` or `API_PUBLIC_URL`.

If the Mini App is deployed with a localhost API URL, the browser will call the visitor's own machine and product loading/order creation will fail.
