# Suup Stars Store

Production-ready full-stack РїСЂРѕРµРєС‚ РґР»СЏ Telegram-Р±РѕС‚Р° Рё Telegram Mini App РјР°РіР°Р·РёРЅР° РїРѕРґ `@SupStarssbot`.

## РЎРѕСЃС‚Р°РІ

- `apps/web` вЂ” Next.js Mini App, checkout, РёСЃС‚РѕСЂРёСЏ Р·Р°РєР°Р·РѕРІ, admin tools.
- `apps/api` вЂ” Express API, Prisma, PostgreSQL, Telegram initData validation.
- `apps/bot` вЂ” grammY bot СЃ РєРѕРјР°РЅРґР°РјРё, РјРµРЅСЋ Рё Web App-РєРЅРѕРїРєР°РјРё.
- `packages/shared` вЂ” Zod-СЃС…РµРјС‹, DTO, СЃС‚Р°С‚СѓСЃС‹, СЂР°СЃС‡РµС‚ С†РµРЅ.

## Р§С‚Рѕ СЂРµР°Р»РёР·РѕРІР°РЅРѕ

- Telegram Stars: РјРёРЅРёРјСѓРј 50, РїСЂРµСЃРµС‚С‹ `50/100/250/500/1000`, РєР°СЃС‚РѕРјРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ, СЂР°СЃС‡РµС‚ `USD` Рё `RUB`.
- Telegram Premium: fixed price `400 RUB` / `5.06 USD`.
- РћС‚РґРµР»СЊРЅС‹Р№ checkout-СЌРєСЂР°РЅ СЃ РїРѕР»СѓС‡Р°С‚РµР»РµРј, РєРѕРјРјРµРЅС‚Р°СЂРёРµРј, РёС‚РѕРіРѕРј, РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµРј Рё РѕС‚РјРµРЅРѕР№.
- Р—Р°РєР°Р·С‹ СЃ idempotency key, РёСЃС‚РѕСЂРёРµР№ СЃС‚Р°С‚СѓСЃРѕРІ Рё СЃС‚Р°С‚СѓСЃР°РјРё `pending`, `awaiting_payment`, `awaiting_manual_verification`, `paid`, `processing`, `completed`, `failed`, `cancelled`, `refunded`.
- Prisma-РјРѕРґРµР»Рё `User`, `Product`, `Order`, `OrderItem`, `Payment`, `OrderStatusHistory`, `AdminAction`.
- Admin flow: СЃРїРёСЃРѕРє Р·Р°РєР°Р·РѕРІ, С„РёР»СЊС‚СЂ РїРѕ СЃС‚Р°С‚СѓСЃСѓ, СЃРјРµРЅР° СЃС‚Р°С‚СѓСЃР°, РІС‹РїРѕР»РЅРµРЅРёРµ, РѕС‚РјРµРЅР°, РІРЅСѓС‚СЂРµРЅРЅРёРµ Р·Р°РјРµС‚РєРё.
- Provider abstraction РґР»СЏ РѕРїР»Р°С‚С‹ Рё РІС‹РґР°С‡Рё Stars/Premium. РЎРµР№С‡Р°СЃ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ С‡РµСЃС‚РЅС‹Р№ manual flow, Р±РµР· С„РµР№РєРѕРІРѕР№ РёРЅС‚РµРіСЂР°С†РёРё СЃ РЅРµСЃСѓС‰РµСЃС‚РІСѓСЋС‰РёРјРё Telegram API.
- РЎРµСЂРІРµСЂРЅР°СЏ РІР°Р»РёРґР°С†РёСЏ Telegram Mini App `initData`.
- Dev fallback РІРЅРµ Telegram С‡РµСЂРµР· `DEV_ALLOW_BROWSER` Рё `NEXT_PUBLIC_DEV_TELEGRAM_ID`.

## Р‘С‹СЃС‚СЂС‹Р№ Р·Р°РїСѓСЃРє

РўСЂРµР±СѓРµС‚СЃСЏ Node.js `22` Рё pnpm. Р•СЃР»Рё РІРєР»СЋС‡РµРЅ Corepack:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Р›РѕРєР°Р»СЊРЅРѕ:

- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Bot: polling mode РёР· `.env`

## Env

РќРµ РєРѕРјРјРёС‚СЊС‚Рµ СЂРµР°Р»СЊРЅС‹Рµ СЃРµРєСЂРµС‚С‹. РњРёРЅРёРјР°Р»СЊРЅРѕ РЅСѓР¶РЅС‹:

- `DATABASE_URL`
- `BOT_TOKEN`
- `WEB_APP_URL`
- `ADMIN_IDS` / `ADMIN_USERNAMES`
- `NEXT_PUBLIC_API_URL`
- `MANUAL_WALLET_ENABLED`, `MANUAL_WALLET_NETWORK`, `MANUAL_WALLET_ASSET`, `MANUAL_WALLET_ADDRESS`

Р”Р»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ РїСЂРѕРІРµСЂРєРё Mini App РІРЅРµ Telegram:

```env
DEV_ALLOW_BROWSER=true
NEXT_PUBLIC_DEV_TELEGRAM_ID=123456789
NEXT_PUBLIC_DEV_USERNAME=dev_admin
ADMIN_IDS=123456789
ADMIN_USERNAMES=dev_admin
```

## Prisma

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Seed СЃРѕР·РґР°РµС‚ РїСЂРѕРґСѓРєС‚С‹:

- `Telegram Stars`: `0.0177 USD`, `1.4 RUB`, minimum `50`.
- `Telegram Premium`: `400 RUB`, `5.06 USD`.

## Telegram Mini App

1. Р—Р°РґРµРїР»РѕР№С‚Рµ `apps/web` РЅР° HTTPS-РґРѕРјРµРЅ.
2. РЈРєР°Р¶РёС‚Рµ РґРѕРјРµРЅ РІ `WEB_APP_URL`.
3. Р’ BotFather РЅР°СЃС‚СЂРѕР№С‚Рµ Mini App / Web App РґР»СЏ `@SupStarssbot`.
4. Р—Р°РїСѓСЃС‚РёС‚Рµ Р±РѕС‚Р°. РћРЅ СѓСЃС‚Р°РЅРѕРІРёС‚ menu button Рё РѕС‚РїСЂР°РІРёС‚ Web App-РєРЅРѕРїРєРё.

API РІР°Р»РёРґРёСЂСѓРµС‚ `window.Telegram.WebApp.initData` С‡РµСЂРµР· HMAC РїРѕ РѕС„РёС†РёР°Р»СЊРЅРѕРјСѓ Р°Р»РіРѕСЂРёС‚РјСѓ Telegram Web Apps.

Р’Р°Р¶РЅРѕ: Telegram РЅРµ РїРѕРєР°Р·С‹РІР°РµС‚ Mini App РґР»СЏ `http://localhost`. Р”Р»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё Р±РѕС‚ РЅРµ РїР°РґР°РµС‚ Рё РїСЂРѕРґРѕР»Р¶Р°РµС‚ РїСЂРѕРґР°РІР°С‚СЊ Stars/Premium РїСЂСЏРјРѕ РІ С‡Р°С‚Рµ, РЅРѕ РєРЅРѕРїРєР° Mini App РїРѕСЏРІР»СЏРµС‚СЃСЏ С‚РѕР»СЊРєРѕ РїСЂРё РїСѓР±Р»РёС‡РЅРѕРј `https://WEB_APP_URL`.

## Bot orders

Р‘РѕС‚ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ РѕС„РѕСЂРјР»РµРЅРёРµ Р·Р°РєР°Р·Р° Р±РµР· Mini App:

1. РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅР°Р¶РёРјР°РµС‚ `РљСѓРїРёС‚СЊ Р·РІС‘Р·РґС‹` РёР»Рё `РљСѓРїРёС‚СЊ Premium`.
2. Р‘РѕС‚ СЃРїСЂР°С€РёРІР°РµС‚ РєРѕР»РёС‡РµСЃС‚РІРѕ, РїРѕР»СѓС‡Р°С‚РµР»СЏ Рё РєРѕРјРјРµРЅС‚Р°СЂРёР№.
3. Р‘РѕС‚ СЃРѕР·РґР°С‘С‚ Р·Р°РєР°Р· С‡РµСЂРµР· С‚РѕС‚ Р¶Рµ API `/orders`, С‡С‚Рѕ Рё СЃР°Р№С‚.
4. Р—Р°РєР°Р· СЃСЂР°Р·Сѓ РІРёРґРµРЅ РІ РёСЃС‚РѕСЂРёРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рё РІ Р°РґРјРёРЅРєРµ.

Р”Р»СЏ СЌС‚РѕРіРѕ API РїСЂРёРЅРёРјР°РµС‚ РІРЅСѓС‚СЂРµРЅРЅРёР№ bot-auth Р·Р°РіРѕР»РѕРІРѕРє `x-bot-token`, РєРѕС‚РѕСЂС‹Р№ РґРѕР»Р¶РµРЅ СЃРѕРІРїР°РґР°С‚СЊ СЃ `BOT_TOKEN`. Р’ production РѕР±С‹С‡РЅС‹Р№ СЃР°Р№С‚ РїРѕ-РїСЂРµР¶РЅРµРјСѓ РѕР±СЏР·Р°РЅ РѕС‚РїСЂР°РІР»СЏС‚СЊ РЅР°СЃС‚РѕСЏС‰РёР№ Telegram `initData`; dev fallback СЂР°Р±РѕС‚Р°РµС‚ С‚РѕР»СЊРєРѕ РїСЂРё `DEV_ALLOW_BROWSER=true`.

## Bot: polling Рё webhook

Development polling:

```env
NODE_ENV=development
BOT_MODE=polling
```

Production webhook on Render:

```env
NODE_ENV=production
BOT_MODE=webhook
BOT_PUBLIC_URL=https://your-bot-service.onrender.com
BOT_WEBHOOK_PATH=/telegram/webhook
BOT_WEBHOOK_SECRET=replace-with-random-secret
```

The production webhook URL is:

```text
https://your-bot-service.onrender.com/telegram/webhook
```

`BOT_WEBHOOK_URL` can override the full URL manually. If it is empty, the bot builds the URL from `BOT_PUBLIC_URL + BOT_WEBHOOK_PATH`.

In webhook mode the bot starts the Express health server, registers `setWebhook` on startup, and accepts Telegram updates only on `POST /telegram/webhook`.

## Р СѓС‡РЅРѕР№ fulfillment

Telegram Stars/Premium РЅРµ РёРЅС‚РµРіСЂРёСЂРѕРІР°РЅС‹ С‡РµСЂРµР· РІС‹РґСѓРјР°РЅРЅС‹Рµ API. РўРµРєСѓС‰РёР№ production-safe РїРѕС‚РѕРє:

1. РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃРѕР·РґР°РµС‚ Р·Р°РєР°Р·.
2. Р—Р°РєР°Р· РїРѕР»СѓС‡Р°РµС‚ СЃС‚Р°С‚СѓСЃ `awaiting_payment`.
3. РђРґРјРёРЅ РІРёРґРёС‚ Р·Р°РєР°Р· РІ `/admin`.
4. РђРґРјРёРЅ РїРѕРґС‚РІРµСЂР¶РґР°РµС‚ РѕРїР»Р°С‚Сѓ СЃС‚Р°С‚СѓСЃРѕРј `paid`.
5. РџРѕСЃР»Рµ СЂСѓС‡РЅРѕР№ РІС‹РґР°С‡Рё Р°РґРјРёРЅ СЃС‚Р°РІРёС‚ `processing` Рё `completed`.
6. РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РїРѕР»СѓС‡Р°РµС‚ СѓРІРµРґРѕРјР»РµРЅРёСЏ РѕС‚ Р±РѕС‚Р° Рё РІРёРґРёС‚ РёСЃС‚РѕСЂРёСЋ СЃС‚Р°С‚СѓСЃРѕРІ.

Р§С‚РѕР±С‹ РґРѕР±Р°РІРёС‚СЊ СЂРµР°Р»СЊРЅРѕРіРѕ РїСЂРѕРІР°Р№РґРµСЂР°, СЂРµР°Р»РёР·СѓР№С‚Рµ РёРЅС‚РµСЂС„РµР№СЃС‹ РІ `apps/api/src/services/providers.ts`:

- `PaymentProvider`
- `StarsDeliveryProvider`
- `PremiumDeliveryProvider`

## Production notes

- РСЃРїРѕР»СЊР·СѓР№С‚Рµ HTTPS РґР»СЏ Mini App Рё API.
- РћРіСЂР°РЅРёС‡СЊС‚Рµ CORS С‡РµСЂРµР· `WEB_APP_URL`.
- РҐСЂР°РЅРёС‚Рµ СЂРµР°Р»СЊРЅС‹Рµ СЃРµРєСЂРµС‚С‹ РІ secret manager.
- Р—Р°РїСѓСЃРєР°Р№С‚Рµ `pnpm --filter @suupstars/api prisma:deploy` РЅР° РґРµРїР»РѕРµ.
- РџРѕРґРєР»СЋС‡РёС‚Рµ РїСЂРѕС†РµСЃСЃ-РјРµРЅРµРґР¶РµСЂ РёР»Рё РєРѕРЅС‚РµР№РЅРµСЂРЅСѓСЋ РѕСЂРєРµСЃС‚СЂР°С†РёСЋ РґР»СЏ API Рё bot.

## Manual wallet transfer

Wallet transfer is a separate payment provider (`manual_wallet_transfer`). User creates a payment session, sees network/asset/address/memo from env, submits tx hash, and the order moves to `awaiting_manual_verification`. Admin approve sets payment/order to `paid`; reject sets payment to `rejected` and keeps the order payable.