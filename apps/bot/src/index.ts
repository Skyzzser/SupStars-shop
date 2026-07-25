import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { Bot, InlineKeyboard, InputFile, webhookCallback, type Context } from "grammy";
import {
  BotApiError,
  adminVerifyBotManualWalletPayment,
  confirmBotManualWalletPayment,
  createBotCryptoInvoice,
  createBotManualWalletPayment,
  createBotOrder,
  listBotOrders,
  type PaymentDto,
} from "./api.js";
import { botHttpPort, botWebhookPath, botWebhookUrl, canUseTelegramWebApp, env } from "./env.js";
import {
  commentInlineKeyboard,
  cryptoInvoiceInlineKeyboard,
  manualWalletInlineKeyboard,
  paymentMethodInlineKeyboard,
  mainReplyKeyboard,
  quantityInlineKeyboard,
  storeInlineKeyboard,
  supportInlineKeyboard,
} from "./keyboards.js";
import { faqMessage, supportMessage, welcomeMessage } from "./messages.js";

const bot = new Bot(env.BOT_TOKEN);

type ProductType = "stars" | "premium";

type Draft = {
  productType: ProductType;
  step: "quantity" | "recipient" | "comment";
  quantity: number;
  recipient?: string;
};

const drafts = new Map<number, Draft>();
const manualPaymentDrafts = new Map<number, string>();

const commands = [
  { command: "start", description: "Открыть главное меню" },
  { command: "shop", description: "Открыть магазин" },
  { command: "orders", description: "Мои заказы" },
  { command: "faq", description: "FAQ" },
  { command: "support", description: "Поддержка" },
] as const;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in bot process", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in bot process", error);
});

function getUserId(ctx: Context) {
  return ctx.from?.id;
}

function getTelegramUser(ctx: Context) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }

  const user: { id: number; username?: string; first_name?: string } = { id: ctx.from.id };

  if (ctx.from.username) {
    user.username = ctx.from.username;
  }

  if (ctx.from.first_name) {
    user.first_name = ctx.from.first_name;
  }

  return user;
}

function getBannerPath() {
  const candidates = [
    resolve(process.cwd(), "apps/bot/assets/start-banner.png"),
    resolve(process.cwd(), "assets/start-banner.png"),
  ];

  return candidates.find((path) => existsSync(path));
}

function normalizeRecipient(value: string) {
  return value.trim().replace(/^@/, "");
}

function parseStarsQuantity(value: string) {
  const quantity = Number(value.trim());
  return Number.isInteger(quantity) && quantity >= 50 ? quantity : null;
}

async function safeReply(ctx: Context, text: string, options?: Parameters<Context["reply"]>[1]) {
  try {
    await ctx.reply(text, options);
  } catch (error) {
    console.error("Failed to send bot reply", error);
  }
}

async function sendStart(ctx: Context) {
  const bannerPath = getBannerPath();

  if (bannerPath) {
    try {
      await ctx.replyWithPhoto(new InputFile(bannerPath), {
        caption: welcomeMessage,
        parse_mode: "HTML",
        reply_markup: mainReplyKeyboard(),
      });
    } catch (error) {
      console.error("Failed to send start banner", error);
      await safeReply(ctx, welcomeMessage, { parse_mode: "HTML", reply_markup: mainReplyKeyboard() });
    }
  } else {
    await safeReply(ctx, welcomeMessage, { parse_mode: "HTML", reply_markup: mainReplyKeyboard() });
  }

  await safeReply(ctx, "Выберите, что хотите купить:", { reply_markup: storeInlineKeyboard() });
}

async function startStarsOrder(ctx: Context) {
  const userId = getUserId(ctx);
  if (!userId) return;

  drafts.set(userId, { productType: "stars", step: "quantity", quantity: 50 });
  await safeReply(ctx, "Сколько Telegram Stars хотите купить? Минимум 50. Напишите число или выберите кнопку:", {
    reply_markup: quantityInlineKeyboard(),
  });
}

async function startPremiumOrder(ctx: Context) {
  const userId = getUserId(ctx);
  if (!userId) return;

  drafts.set(userId, { productType: "premium", step: "recipient", quantity: 1 });
  await safeReply(ctx, "Кому оформить Telegram Premium? Отправьте @username или Telegram ID получателя.");
}

async function askRecipient(ctx: Context, quantity: number) {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;
  if (!userId || !draft) return;

  drafts.set(userId, { ...draft, quantity, step: "recipient" });
  await safeReply(ctx, "Кому отправить заказ? Отправьте @username или Telegram ID получателя.");
}

async function createCryptoInvoicesForOrder(orderId: string, user: { id: number; username?: string; first_name?: string }) {
  const results = await Promise.allSettled([
    createBotCryptoInvoice({ orderId, asset: "USDT" }, user),
    createBotCryptoInvoice({ orderId, asset: "TON" }, user),
  ]);

  const payments: PaymentDto[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      payments.push(result.value.payment);
    } else {
      logBotApiError("Failed to create crypto invoice", result.reason);
    }
  }

  return payments;
}

async function sendCryptoPaymentOptions(ctx: Context, orderId: string) {
  try {
    const payments = await createCryptoInvoicesForOrder(orderId, getTelegramUser(ctx));
    await safeReply(
      ctx,
      payments.length > 0
        ? "Выберите счет Crypto Bot. Заказ станет оплаченным только после webhook-подтверждения."
        : "Не удалось создать счета Crypto Bot. Попробуйте перевод на кошелек или напишите в поддержку @SuupStarbot.",
      { reply_markup: payments.length > 0 ? cryptoInvoiceInlineKeyboard(payments) : storeInlineKeyboard() },
    );
  } catch (error) {
    logBotApiError("Failed to create crypto payment options", error);
    await safeReply(ctx, "Не удалось создать Crypto Bot invoice. Попробуйте позже или выберите перевод на кошелек.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

async function sendManualWalletPayment(ctx: Context, orderId: string) {
  try {
    const { order, payment } = await createBotManualWalletPayment({ orderId }, getTelegramUser(ctx));
    await safeReply(ctx, formatManualWalletMessage(order.orderNumber, payment), {
      parse_mode: "HTML",
      reply_markup: manualWalletInlineKeyboard(payment.id),
    });
  } catch (error) {
    logBotApiError("Failed to create manual wallet payment", error);
    await safeReply(ctx, "Не удалось подготовить реквизиты кошелька. Напишите в @SuupStarbot или попробуйте Crypto Bot.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

function formatManualWalletMessage(orderNumber: string, payment: PaymentDto) {
  const wallet = payment.manualWallet;
  if (!wallet) {
    return "Реквизиты кошелька недоступны. Напишите в поддержку @SuupStarbot.";
  }

  return [
    "<b>Перевод на кошелек</b>",
    "",
    `Заказ: <b>${orderNumber}</b>`,
    `Сеть: <b>${wallet.network}</b>`,
    `Монета: <b>${wallet.asset}</b>`,
    `Сумма: <b>${payment.amount ?? payment.amountUsd ?? ""} ${payment.asset ?? wallet.asset}</b>`,
    `Адрес: <code>${wallet.address}</code>`,
    wallet.memo ? `Memo: <code>${wallet.memo}</code>` : "",
    wallet.instructions ? `Важно: ${wallet.instructions}` : "",
    "",
    "После перевода нажмите <b>Я оплатил</b> и отправьте tx hash / transaction id. Заказ станет оплаченным после проверки администратором.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function createOrderFromDraft(ctx: Context, comment = "") {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;

  if (!userId || !draft || !draft.recipient) {
    await safeReply(ctx, "Заказ не найден. Начните заново через кнопку покупки.", { reply_markup: storeInlineKeyboard() });
    return;
  }

  try {
    const { order } = await createBotOrder(
      { productType: draft.productType, quantity: draft.quantity, recipient: draft.recipient, comment },
      getTelegramUser(ctx),
    );

    drafts.delete(userId);
    await safeReply(
      ctx,
      [
        "<b>Заказ создан</b>",
        "",
        `Номер: <b>${order.orderNumber}</b>`,
        `Получатель: @${order.recipientUsername}`,
        `Сумма: <b>${order.totalRub} RUB / ${order.totalUsd} USD</b>`,
        `Статус: <b>${order.status}</b>`,
        "",
        "Выберите способ оплаты:",
      ].join("\n"),
      { parse_mode: "HTML", reply_markup: paymentMethodInlineKeyboard(order.id) },
    );
  } catch (error) {
    logBotApiError("Failed to create bot order", error);
    await safeReply(ctx, "Не удалось создать заказ. Попробуйте позже или напишите в @SuupStarbot.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

function logBotApiError(message: string, error: unknown) {
  if (error instanceof BotApiError) {
    console.error(message, { status: error.status, code: error.code, detail: error.message });
    return;
  }

  console.error(message, error);
}

function ordersWithPaymentKeyboard(orders: Array<{ orderNumber: string; currentPayment?: PaymentDto | null }>) {
  const keyboard = new InlineKeyboard();
  let hasPaymentButtons = false;

  for (const order of orders) {
    const payment = order.currentPayment;
    if (payment?.payUrl && payment.asset && payment.status !== "paid") {
      keyboard.url(`${order.orderNumber} / ${payment.asset}`, payment.payUrl).row();
      hasPaymentButtons = true;
    } else if (payment?.provider === "manual_wallet_transfer" && payment.status !== "paid") {
      keyboard.text(`${order.orderNumber} / Я оплатил`, `manual:paid:${payment.id}`).row();
      hasPaymentButtons = true;
    }
  }

  keyboard.text("Обновить", "orders:list");
  return hasPaymentButtons ? keyboard : storeInlineKeyboard();
}

async function showOrders(ctx: Context) {
  try {
    const { orders } = await listBotOrders(getTelegramUser(ctx));

    if (orders.length === 0) {
      await safeReply(ctx, "У вас пока нет заказов.", { reply_markup: storeInlineKeyboard() });
      return;
    }

    const lines = orders.slice(0, 5).flatMap((order) => [
      `<b>${order.orderNumber}</b>`,
      `Получатель: @${order.recipientUsername}`,
      `Сумма: ${order.totalRub} RUB / ${order.totalUsd} USD`,
      `Статус: ${order.status}`,
      order.currentPayment
        ? `Оплата: ${order.currentPayment.status} ${order.currentPayment.asset ?? ""}`.trim()
        : "Оплата: еще не выбрана",
      "",
    ]);

    await safeReply(ctx, ["<b>Ваши последние заказы</b>", "", ...lines].join("\n"), {
      parse_mode: "HTML",
      reply_markup: ordersWithPaymentKeyboard(orders.slice(0, 5)),
    });
  } catch (error) {
    logBotApiError("Failed to load bot orders", error);
    await safeReply(ctx, "Не удалось загрузить заказы. Попробуйте позже.", { reply_markup: storeInlineKeyboard() });
  }
}

async function handleAdminManualVerification(ctx: Context, action: "approve" | "reject", paymentId: string) {
  try {
    const result = await adminVerifyBotManualWalletPayment({ paymentId, action }, getTelegramUser(ctx));
    await ctx.answerCallbackQuery(action === "approve" ? "Оплата подтверждена" : "Оплата отклонена");
    await safeReply(
      ctx,
      `${action === "approve" ? "Подтверждено" : "Отклонено"}: ручной перевод обновлен.\nЗаказ: <b>${result.order.orderNumber}</b>\nСтатус: <b>${result.order.status}</b>`,
      { parse_mode: "HTML" },
    );
  } catch (error) {
    logBotApiError("Failed to verify manual wallet payment from admin callback", error);
    await ctx.answerCallbackQuery({ text: "Не удалось выполнить действие. Проверьте права администратора.", show_alert: true }).catch(() => undefined);
  }
}

bot.command("start", sendStart);
bot.command("shop", async (ctx) => safeReply(ctx, "Выберите, что хотите купить:", { reply_markup: storeInlineKeyboard() }));
bot.command("orders", showOrders);
bot.command("faq", async (ctx) => safeReply(ctx, faqMessage, { parse_mode: "HTML", reply_markup: supportInlineKeyboard() }));
bot.command("support", async (ctx) => safeReply(ctx, supportMessage, { parse_mode: "HTML", reply_markup: supportInlineKeyboard() }));

bot.hears(["Открыть магазин", "Buy Stars", "Купить Stars", "Купить звезды", "Купить звёзды"], async (ctx) => {
  const text = ctx.message?.text ?? "";
  if (text === "Buy Stars" || text.includes("зв")) {
    await startStarsOrder(ctx);
    return;
  }
  await safeReply(ctx, "Выберите, что хотите купить:", { reply_markup: storeInlineKeyboard() });
});
bot.hears(["Buy Premium", "Купить Premium"], startPremiumOrder);
bot.hears(["My orders", "Мои заказы"], showOrders);
bot.hears(["Support", "Поддержка"], async (ctx) => safeReply(ctx, supportMessage, { parse_mode: "HTML", reply_markup: supportInlineKeyboard() }));
bot.hears("FAQ", async (ctx) => safeReply(ctx, faqMessage, { parse_mode: "HTML", reply_markup: supportInlineKeyboard() }));

bot.callbackQuery("buy:stars", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startStarsOrder(ctx);
});

bot.callbackQuery("buy:premium", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startPremiumOrder(ctx);
});

bot.callbackQuery("orders:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showOrders(ctx);
});

bot.callbackQuery("faq:open", async (ctx) => {
  await ctx.answerCallbackQuery();
  await safeReply(ctx, faqMessage, { parse_mode: "HTML", reply_markup: supportInlineKeyboard() });
});

bot.callbackQuery(/^pay:crypto:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  if (orderId) await sendCryptoPaymentOptions(ctx, orderId);
});

bot.callbackQuery(/^pay:wallet:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  if (orderId) await sendManualWalletPayment(ctx, orderId);
});

bot.callbackQuery(/^manual:paid:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = getUserId(ctx);
  const paymentId = ctx.match[1];
  if (!userId || !paymentId) return;

  manualPaymentDrafts.set(userId, paymentId);
  await safeReply(ctx, "Отправьте tx hash / transaction id. Если его нет, отправьте '-' и администратор проверит перевод вручную.");
});

bot.callbackQuery(/^admin:manual:(approve|reject):(.+)$/, async (ctx) => {
  const action = ctx.match[1] as "approve" | "reject" | undefined;
  const paymentId = ctx.match[2];
  if (!action || !paymentId) return;
  await handleAdminManualVerification(ctx, action, paymentId);
});

bot.callbackQuery("order:cancel", async (ctx) => {
  const userId = getUserId(ctx);
  if (userId) {
    drafts.delete(userId);
    manualPaymentDrafts.delete(userId);
  }

  await ctx.answerCallbackQuery("Заказ отменен");
  await safeReply(ctx, "Оформление отменено.", { reply_markup: storeInlineKeyboard() });
});

bot.callbackQuery("comment:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  await createOrderFromDraft(ctx);
});

bot.callbackQuery(/^qty:(\d+)$/, async (ctx) => {
  const quantity = Number(ctx.match[1] ?? "0");
  await ctx.answerCallbackQuery();
  await askRecipient(ctx, quantity);
});

bot.on("message:text", async (ctx) => {
  const userId = getUserId(ctx);
  const text = ctx.message.text.trim();
  const manualPaymentId = userId ? manualPaymentDrafts.get(userId) : undefined;

  if (userId && manualPaymentId) {
    try {
      const txHash = text === "-" ? "" : text;
      const { order } = await confirmBotManualWalletPayment({ paymentId: manualPaymentId, txHash }, getTelegramUser(ctx));
      manualPaymentDrafts.delete(userId);
      await safeReply(
        ctx,
        `Платеж отправлен на проверку.\nЗаказ: <b>${order.orderNumber}</b>\nСтатус: <b>${order.status}</b>`,
        { parse_mode: "HTML", reply_markup: storeInlineKeyboard() },
      );
    } catch (error) {
      logBotApiError("Failed to submit manual wallet payment", error);
      await safeReply(ctx, "Не удалось отправить подтверждение оплаты. Попробуйте еще раз или напишите в @SuupStarbot.");
    }
    return;
  }

  const draft = userId ? drafts.get(userId) : undefined;
  if (!userId || !draft) return;

  if (draft.step === "quantity") {
    const quantity = parseStarsQuantity(text);
    if (!quantity) {
      await safeReply(ctx, "Введите целое число от 50 или выберите готовое количество:", { reply_markup: quantityInlineKeyboard() });
      return;
    }
    await askRecipient(ctx, quantity);
    return;
  }

  if (draft.step === "recipient") {
    const recipient = normalizeRecipient(text);
    if (!recipient) {
      await safeReply(ctx, "Отправьте @username или Telegram ID получателя.");
      return;
    }

    drafts.set(userId, { ...draft, recipient, step: "comment" });
    await safeReply(ctx, "Комментарий к заказу? Если не нужен, нажмите «Пропустить».", { reply_markup: commentInlineKeyboard() });
    return;
  }

  if (draft.step === "comment") {
    await createOrderFromDraft(ctx, text);
  }
});

bot.catch((error) => {
  console.error("Bot middleware error", error.error);
});

async function configureBotMenu() {
  if (!canUseTelegramWebApp()) {
    console.warn(`WEB_APP_URL=${env.WEB_APP_URL} is not HTTPS. Telegram Mini Apps require a public HTTPS URL.`);
    return;
  }

  await bot.api.setChatMenuButton({
    menu_button: { type: "web_app", text: "Suup Stars", web_app: { url: env.WEB_APP_URL } },
  });
  console.log(`Telegram Web App menu button configured for ${env.WEB_APP_URL}`);
}

function createHealthApp() {
  const app = express();

  app.get("/", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "bot",
      mode: env.BOT_MODE,
      webhookPath: env.BOT_MODE === "webhook" ? botWebhookPath : undefined,
    });
  });

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}

function listenHttp(app: express.Express) {
  app.listen(botHttpPort, "0.0.0.0", () => {
    console.log(`Bot HTTP health server is listening on http://0.0.0.0:${botHttpPort}`);
  });
}

async function start() {
  console.log(`Starting bot in ${env.BOT_MODE} mode`);
  await bot.api.setMyCommands(commands);
  console.log("Bot commands configured");
  await configureBotMenu();

  if (env.BOT_MODE === "webhook") {
    if (!botWebhookUrl) {
      throw new Error("BOT_PUBLIC_URL or BOT_WEBHOOK_URL is required for webhook mode");
    }

    await bot.api.setWebhook(botWebhookUrl, env.BOT_WEBHOOK_SECRET ? { secret_token: env.BOT_WEBHOOK_SECRET } : undefined);
    console.log(`Telegram webhook configured: ${botWebhookUrl}`);

    const app = createHealthApp();
    app.post(
      botWebhookPath,
      express.json(),
      webhookCallback(bot, "express", env.BOT_WEBHOOK_SECRET ? { secretToken: env.BOT_WEBHOOK_SECRET } : undefined),
    );
    console.log(`Telegram webhook endpoint is listening on POST ${botWebhookPath}`);
    listenHttp(app);
    return;
  }

  listenHttp(createHealthApp());
  await bot.api.deleteWebhook();
  await bot.start({ onStart: (info) => console.log(`Bot @${info.username} started in polling mode`) });
}

start().catch((error: unknown) => {
  console.error("Fatal bot startup error", error);
  process.exit(1);
});
