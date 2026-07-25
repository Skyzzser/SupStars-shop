# SupStars Store

Full-stack проект для магазина Telegram Stars и Telegram Premium: Mini App, API и Telegram bot `@SuupStarbot`.

Поддержка: https://t.me/SuupStarbot

## Состав

- `apps/web` - Next.js Mini App: каталог, checkout, оплата, история заказов, admin panel.
- `apps/api` - Express API, Prisma, PostgreSQL, Telegram initData validation.
- `apps/bot` - grammY bot с заказами, Crypto Bot invoice и manual wallet transfer.
- `packages/shared` - DTO, Zod-схемы, статусы и pricing.

## Pricing

- Stars: `1.4 RUB` / `0.0177 USD` за 1 Star, минимум `50`.
- Premium: `400 RUB` / `5.06 USD`.
- Service fee пока выключена в `SERVICE_FEE_CONFIG`.

## Payment Flow

- Crypto Bot: заказ становится `paid` только после Crypto Pay webhook.
- Manual wallet transfer: пользователь создает payment session, переводит средства, нажимает `Я оплатил` и при желании отправляет tx hash. Заказ становится `awaiting_manual_verification`. Администратор подтверждает или отклоняет оплату через admin panel или inline-кнопки в Telegram notification.

## Важные статусы

- `awaiting_payment` - заказ ожидает выбора способа оплаты или оплаты.
- `awaiting_manual_verification` - пользователь отметил wallet transfer как оплаченный, администратор проверяет.
- `paid` - оплата подтверждена.

## Env

Минимально нужны:

```env
DATABASE_URL=postgresql://...
BOT_TOKEN=123456:token
WEB_APP_URL=https://your-mini-app.example.com
API_PUBLIC_URL=https://your-api.example.com
NEXT_PUBLIC_API_URL=https://your-api.example.com
ADMIN_IDS=123456789
ADMIN_USERNAMES=admin_username
SUPPORT_URL=https://t.me/SuupStarbot
```

Manual wallet:

```env
MANUAL_WALLET_ENABLED=true
MANUAL_WALLET_NETWORK=TON
MANUAL_WALLET_ASSET=USDT
MANUAL_WALLET_ADDRESS=replace-with-wallet-address
MANUAL_WALLET_MEMO=
MANUAL_WALLET_INSTRUCTIONS=Отправьте точную сумму и нажмите Я оплатил после перевода.
```

Bot webhook:

```env
BOT_MODE=webhook
BOT_PUBLIC_URL=https://your-bot-service.onrender.com
BOT_WEBHOOK_PATH=/telegram/webhook
BOT_WEBHOOK_SECRET=replace-with-random-secret
```

## Команды

```bash
pnpm install
pnpm --filter @suupstars/api prisma:generate
pnpm --filter @suupstars/api prisma:deploy
pnpm db:seed
pnpm build
```

После изменения product descriptions или цен нужно повторно запустить seed для production DB.
