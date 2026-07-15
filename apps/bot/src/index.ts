import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { Bot, InlineKeyboard, InputFile, webhookCallback, type Context } from "grammy";
import { BotApiError, createBotCryptoInvoice, createBotOrder, listBotOrders, type PaymentDto } from "./api.js";
import { botHttpPort, canUseTelegramWebApp, env } from "./env.js";
import {
  commentInlineKeyboard,
  cryptoInvoiceInlineKeyboard,
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

const commands = [
  { command: "start", description: "Открыть главное меню" },
  { command: "shop", description: "Открыть магазин" },
  { command: "orders", description: "Мои заказы" },
  { command: "faq", description: "FAQ" },
  { command: "support", description: "Поддержка" },
] as const;

function getUserId(ctx: Context) {
  return ctx.from?.id;
}

function getTelegramUser(ctx: Context) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }

  const user: { id: number; username?: string; first_name?: string } = {
    id: ctx.from.id,
  };

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

  if (!Number.isInteger(quantity) || quantity < 50) {
    return null;
  }

  return quantity;
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
      await ctx.reply(welcomeMessage, {
        parse_mode: "HTML",
        reply_markup: mainReplyKeyboard(),
      });
    }
  } else {
    await ctx.reply(welcomeMessage, {
      parse_mode: "HTML",
      reply_markup: mainReplyKeyboard(),
    });
  }

  await ctx.reply("Выберите, что хотите купить:", {
    reply_markup: storeInlineKeyboard(),
  });
}

async function startStarsOrder(ctx: Context) {
  const userId = getUserId(ctx);
  if (!userId) {
    return;
  }

  drafts.set(userId, {
    productType: "stars",
    step: "quantity",
    quantity: 50,
  });

  await ctx.reply("Сколько Telegram Stars хотите купить? Минимум 50. Можно написать число или выбрать кнопку:", {
    reply_markup: quantityInlineKeyboard(),
  });
}

async function startPremiumOrder(ctx: Context) {
  const userId = getUserId(ctx);
  if (!userId) {
    return;
  }

  drafts.set(userId, {
    productType: "premium",
    step: "recipient",
    quantity: 1,
  });

  await ctx.reply("Кому оформить Telegram Premium? Отправьте @username или Telegram ID получателя.");
}

async function askRecipient(ctx: Context, quantity: number) {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;
  if (!userId || !draft) {
    return;
  }

  drafts.set(userId, { ...draft, quantity, step: "recipient" });
  await ctx.reply("Кому отправить заказ? Отправьте @username или Telegram ID получателя.");
}

async function createCryptoInvoicesForOrder(
  orderId: string,
  user: { id: number; username?: string; first_name?: string },
) {
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

async function createOrderFromDraft(
  ctx: Context,
  comment = "",
) {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;

  if (!userId || !draft || !draft.recipient) {
    await ctx.reply("Заказ не найден. Начните заново через кнопку «Купить звёзды» или «Купить Premium».", {
      reply_markup: storeInlineKeyboard(),
    });
    return;
  }

  try {
    const { order } = await createBotOrder(
      {
        productType: draft.productType,
        quantity: draft.quantity,
        recipient: draft.recipient,
        comment,
      },
      getTelegramUser(ctx),
    );

    drafts.delete(userId);
    const payments = await createCryptoInvoicesForOrder(order.id, getTelegramUser(ctx));

    await ctx.reply(
      [
        "✅ <b>Заказ создан</b>",
        "",
        `Номер: <b>${order.orderNumber}</b>`,
        `Получатель: @${order.recipientUsername}`,
        `Сумма: <b>${order.totalRub} RUB</b>`,
        `Статус: <b>${order.status}</b>`,
        "",
        payments.length > 0
          ? "Выберите счет Crypto Bot для оплаты. Статус изменится после подтверждения webhook."
          : "Заказ создан, но счета Crypto Bot не удалось создать. Напишите в поддержку или попробуйте позже.",
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: payments.length > 0 ? cryptoInvoiceInlineKeyboard(payments) : storeInlineKeyboard(),
      },
    );
  } catch (error) {
    logBotApiError("Failed to create bot order", error);
    await ctx.reply(
      "Не получилось создать заказ. Мы уже записали причину в логах бота. Попробуйте еще раз чуть позже или напишите в поддержку.",
      { reply_markup: storeInlineKeyboard() },
    );
  }
}

function logBotApiError(message: string, error: unknown) {
  if (error instanceof BotApiError) {
    console.error(message, {
      status: error.status,
      code: error.code,
      detail: error.message,
    });
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
      keyboard.url(`${order.orderNumber} · ${payment.asset}`, payment.payUrl).row();
      hasPaymentButtons = true;
    }
  }

  keyboard.text("Обновить", "orders:list").text("FAQ", "faq:open");

  return hasPaymentButtons ? keyboard : storeInlineKeyboard();
}

async function showOrders(ctx: Context) {
  try {
    const { orders } = await listBotOrders(getTelegramUser(ctx));

    if (orders.length === 0) {
      await ctx.reply("У вас пока нет заказов.", { reply_markup: storeInlineKeyboard() });
      return;
    }

    const lines = orders.slice(0, 5).flatMap((order) => [
      `<b>${order.orderNumber}</b>`,
      `Получатель: @${order.recipientUsername}`,
      `Сумма: ${order.totalRub} RUB`,
      `Статус: ${order.status}`,
      order.currentPayment
        ? `Оплата: ${order.currentPayment.status} ${order.currentPayment.asset ?? ""}`.trim()
        : "Оплата: invoice ещё нет",
      "",
    ]);

    await ctx.reply(["<b>Ваши последние заказы</b>", "", ...lines].join("\n"), {
      parse_mode: "HTML",
      reply_markup: ordersWithPaymentKeyboard(orders.slice(0, 5)),
    });
  } catch (error) {
    logBotApiError("Failed to load bot orders", error);
    await ctx.reply("Не получилось загрузить заказы. Попробуйте еще раз чуть позже.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

bot.command("start", async (ctx) => {
  await sendStart(ctx);
});

bot.command("shop", async (ctx) => {
  await ctx.reply("Выберите, что хотите купить:", {
    reply_markup: storeInlineKeyboard(),
  });
});

bot.command("orders", async (ctx) => {
  await showOrders(ctx);
});

bot.command("faq", async (ctx) => {
  await ctx.reply(faqMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

bot.command("support", async (ctx) => {
  await ctx.reply(supportMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

bot.hears("Открыть магазин", async (ctx) => {
  await ctx.reply("Выберите, что хотите купить:", { reply_markup: storeInlineKeyboard() });
});

bot.hears("Купить звёзды", async (ctx) => {
  await startStarsOrder(ctx);
});

bot.hears("Купить Premium", async (ctx) => {
  await startPremiumOrder(ctx);
});

bot.hears("Мои заказы", async (ctx) => {
  await showOrders(ctx);
});

bot.hears("FAQ", async (ctx) => {
  await ctx.reply(faqMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

bot.hears("Поддержка", async (ctx) => {
  await ctx.reply(supportMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

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
  await ctx.reply(faqMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

bot.callbackQuery("order:cancel", async (ctx) => {
  const userId = getUserId(ctx);
  if (userId) {
    drafts.delete(userId);
  }

  await ctx.answerCallbackQuery("Заказ отменён");
  await ctx.reply("Оформление отменено.", { reply_markup: storeInlineKeyboard() });
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
  const draft = userId ? drafts.get(userId) : undefined;

  if (!userId || !draft) {
    return;
  }

  const text = ctx.message.text.trim();

  if (draft.step === "quantity") {
    const quantity = parseStarsQuantity(text);

    if (!quantity) {
      await ctx.reply("Введите целое число от 50 или выберите готовое количество:", {
        reply_markup: quantityInlineKeyboard(),
      });
      return;
    }

    await askRecipient(ctx, quantity);
    return;
  }

  if (draft.step === "recipient") {
    const recipient = normalizeRecipient(text);

    if (!recipient) {
      await ctx.reply("Отправьте @username или Telegram ID получателя.");
      return;
    }

    drafts.set(userId, { ...draft, recipient, step: "comment" });
    await ctx.reply("Комментарий к заказу? Если не нужен, нажмите «Пропустить».", {
      reply_markup: commentInlineKeyboard(),
    });
    return;
  }

  if (draft.step === "comment") {
    await createOrderFromDraft(ctx, text);
  }
});

bot.catch((error) => {
  console.error("Bot error", error);
});

async function configureBotMenu() {
  if (!canUseTelegramWebApp()) {
    console.warn(
      `WEB_APP_URL=${env.WEB_APP_URL} is not HTTPS. Telegram Mini Apps require a public HTTPS URL, so the Web App menu button was skipped.`,
    );
    return;
  }

  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Suup Stars",
      web_app: { url: env.WEB_APP_URL },
    },
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
    if (!env.BOT_WEBHOOK_URL) {
      throw new Error("BOT_WEBHOOK_URL is required for webhook mode");
    }

    await bot.api.setWebhook(
      env.BOT_WEBHOOK_URL,
      env.BOT_WEBHOOK_SECRET ? { secret_token: env.BOT_WEBHOOK_SECRET } : undefined,
    );

    const app = createHealthApp();
    app.use(express.json());
    app.use(
      webhookCallback(
        bot,
        "express",
        env.BOT_WEBHOOK_SECRET ? { secretToken: env.BOT_WEBHOOK_SECRET } : undefined,
      ),
    );
    listenHttp(app);
    return;
  }

  listenHttp(createHealthApp());
  await bot.api.deleteWebhook();
  await bot.start({
    onStart: (info) => console.log(`Bot @${info.username} started in polling mode`),
  });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
