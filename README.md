# Suup Stars Store

Production-ready full-stack проект для Telegram-бота и Telegram Mini App магазина под `@SuupStarsbot`.

## Состав

- `apps/web` — Next.js Mini App, checkout, история заказов, admin tools.
- `apps/api` — Express API, Prisma, PostgreSQL, Telegram initData validation.
- `apps/bot` — grammY bot с командами, меню и Web App-кнопками.
- `packages/shared` — Zod-схемы, DTO, статусы, расчет цен.

## Что реализовано

- Telegram Stars: минимум 50, пресеты `50/100/250/500/1000`, кастомное количество, расчет `USD` и `RUB`.
- Telegram Premium: фиксированная цена `400 RUB`.
- Отдельный checkout-экран с получателем, комментарием, итогом, подтверждением и отменой.
- Заказы с idempotency key, историей статусов и статусами `pending`, `awaiting_payment`, `paid`, `processing`, `completed`, `failed`, `cancelled`, `refunded`.
- Prisma-модели `User`, `Product`, `Order`, `OrderItem`, `Payment`, `OrderStatusHistory`, `AdminAction`.
- Admin flow: список заказов, фильтр по статусу, смена статуса, выполнение, отмена, внутренние заметки.
- Provider abstraction для оплаты и выдачи Stars/Premium. Сейчас используется честный manual flow, без фейковой интеграции с несуществующими Telegram API.
- Серверная валидация Telegram Mini App `initData`.
- Dev fallback вне Telegram через `DEV_ALLOW_BROWSER` и `NEXT_PUBLIC_DEV_TELEGRAM_ID`.

## Быстрый запуск

Требуется Node.js `22` и pnpm. Если включен Corepack:

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

Локально:

- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Bot: polling mode из `.env`

## Env

Не коммитьте реальные секреты. Минимально нужны:

- `DATABASE_URL`
- `BOT_TOKEN`
- `WEB_APP_URL`
- `ADMIN_IDS`
- `NEXT_PUBLIC_API_URL`

Для локальной проверки Mini App вне Telegram:

```env
DEV_ALLOW_BROWSER=true
NEXT_PUBLIC_DEV_TELEGRAM_ID=123456789
NEXT_PUBLIC_DEV_USERNAME=dev_admin
ADMIN_IDS=123456789
```

## Prisma

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Seed создает продукты:

- `Telegram Stars`: `0.019 USD`, `1.5 RUB`, минимум `50`.
- `Telegram Premium`: `400 RUB`.

## Telegram Mini App

1. Задеплойте `apps/web` на HTTPS-домен.
2. Укажите домен в `WEB_APP_URL`.
3. В BotFather настройте Mini App / Web App для `@SuupStarsbot`.
4. Запустите бота. Он установит menu button и отправит Web App-кнопки.

API валидирует `window.Telegram.WebApp.initData` через HMAC по официальному алгоритму Telegram Web Apps.

Важно: Telegram не показывает Mini App для `http://localhost`. Для локальной разработки бот не падает и продолжает продавать Stars/Premium прямо в чате, но кнопка Mini App появляется только при публичном `https://WEB_APP_URL`.

## Bot orders

Бот поддерживает оформление заказа без Mini App:

1. Пользователь нажимает `Купить звёзды` или `Купить Premium`.
2. Бот спрашивает количество, получателя и комментарий.
3. Бот создаёт заказ через тот же API `/orders`, что и сайт.
4. Заказ сразу виден в истории пользователя и в админке.

Для этого API принимает внутренний bot-auth заголовок `x-bot-token`, который должен совпадать с `BOT_TOKEN`. В production обычный сайт по-прежнему обязан отправлять настоящий Telegram `initData`; dev fallback работает только при `DEV_ALLOW_BROWSER=true`.

## Bot: polling и webhook

Polling:

```env
BOT_MODE=polling
```

Webhook:

```env
BOT_MODE=webhook
BOT_WEBHOOK_URL=https://your-domain.example.com
BOT_WEBHOOK_SECRET=replace-with-random-secret
BOT_PORT=4010
```

В webhook-режиме приложение запускает Express server и регистрирует webhook через Telegram Bot API.

## Ручной fulfillment

Telegram Stars/Premium не интегрированы через выдуманные API. Текущий production-safe поток:

1. Пользователь создает заказ.
2. Заказ получает статус `awaiting_payment`.
3. Админ видит заказ в `/admin`.
4. Админ подтверждает оплату статусом `paid`.
5. После ручной выдачи админ ставит `processing` и `completed`.
6. Пользователь получает уведомления от бота и видит историю статусов.

Чтобы добавить реального провайдера, реализуйте интерфейсы в `apps/api/src/services/providers.ts`:

- `PaymentProvider`
- `StarsDeliveryProvider`
- `PremiumDeliveryProvider`

## Production notes

- Используйте HTTPS для Mini App и API.
- Ограничьте CORS через `WEB_APP_URL`.
- Храните реальные секреты в secret manager.
- Запускайте `pnpm --filter @suupstars/api prisma:deploy` на деплое.
- Подключите процесс-менеджер или контейнерную оркестрацию для API и bot.
