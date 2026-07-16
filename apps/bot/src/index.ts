import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { Bot, InlineKeyboard, InputFile, webhookCallback, type Context } from "grammy";
import { BotApiError, confirmBotManualWalletPayment, createBotCryptoInvoice, createBotManualWalletPayment, createBotOrder, listBotOrders, type PaymentDto } from "./api.js";
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
  { command: "start", description: "РћС‚РєСЂС‹С‚СЊ РіР»Р°РІРЅРѕРµ РјРµРЅСЋ" },
  { command: "shop", description: "РћС‚РєСЂС‹С‚СЊ РјР°РіР°Р·РёРЅ" },
  { command: "orders", description: "РњРѕРё Р·Р°РєР°Р·С‹" },
  { command: "faq", description: "FAQ" },
  { command: "support", description: "РџРѕРґРґРµСЂР¶РєР°" },
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

  await ctx.reply("Р’С‹Р±РµСЂРёС‚Рµ, С‡С‚Рѕ С…РѕС‚РёС‚Рµ РєСѓРїРёС‚СЊ:", {
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

  await ctx.reply("РЎРєРѕР»СЊРєРѕ Telegram Stars С…РѕС‚РёС‚Рµ РєСѓРїРёС‚СЊ? РњРёРЅРёРјСѓРј 50. РњРѕР¶РЅРѕ РЅР°РїРёСЃР°С‚СЊ С‡РёСЃР»Рѕ РёР»Рё РІС‹Р±СЂР°С‚СЊ РєРЅРѕРїРєСѓ:", {
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

  await ctx.reply("РљРѕРјСѓ РѕС„РѕСЂРјРёС‚СЊ Telegram Premium? РћС‚РїСЂР°РІСЊС‚Рµ @username РёР»Рё Telegram ID РїРѕР»СѓС‡Р°С‚РµР»СЏ.");
}

async function askRecipient(ctx: Context, quantity: number) {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;
  if (!userId || !draft) {
    return;
  }

  drafts.set(userId, { ...draft, quantity, step: "recipient" });
  await ctx.reply("РљРѕРјСѓ РѕС‚РїСЂР°РІРёС‚СЊ Р·Р°РєР°Р·? РћС‚РїСЂР°РІСЊС‚Рµ @username РёР»Рё Telegram ID РїРѕР»СѓС‡Р°С‚РµР»СЏ.");
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


async function sendCryptoPaymentOptions(ctx: Context, orderId: string) {
  try {
    const payments = await createCryptoInvoicesForOrder(orderId, getTelegramUser(ctx));
    await ctx.reply(
      payments.length > 0
        ? "Choose a Crypto Bot invoice. Order becomes paid only after Crypto Pay webhook confirmation."
        : "Crypto Bot invoices could not be created. Try wallet transfer or contact support.",
      {
        reply_markup: payments.length > 0 ? cryptoInvoiceInlineKeyboard(payments) : storeInlineKeyboard(),
      },
    );
  } catch (error) {
    logBotApiError("Failed to create crypto payment options", error);
    await ctx.reply("Could not create Crypto Bot invoices. Try again later or use wallet transfer.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

async function sendManualWalletPayment(ctx: Context, orderId: string) {
  try {
    const { order, payment } = await createBotManualWalletPayment({ orderId }, getTelegramUser(ctx));
    await ctx.reply(formatManualWalletMessage(order.orderNumber, payment), {
      parse_mode: "HTML",
      reply_markup: manualWalletInlineKeyboard(payment.id),
    });
  } catch (error) {
    logBotApiError("Failed to create manual wallet payment", error);
    await ctx.reply("Could not prepare wallet transfer details. Check support or try Crypto Bot.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

function formatManualWalletMessage(orderNumber: string, payment: PaymentDto) {
  const wallet = payment.manualWallet;
  if (!wallet) {
    return "Wallet details are unavailable. Contact support.";
  }

  return [
    "<b>Wallet transfer</b>",
    "",
    `Order: <b>${orderNumber}</b>`,
    `Network: <b>${wallet.network}</b>`,
    `Asset: <b>${wallet.asset}</b>`,
    `Amount: <b>${payment.amount ?? payment.amountUsd ?? ""} ${payment.asset ?? wallet.asset}</b>`,
    `Address: <code>${wallet.address}</code>`,
    wallet.memo ? `Memo: <code>${wallet.memo}</code>` : "",
    wallet.instructions ? `Note: ${wallet.instructions}` : "",
    "",
    "After transfer, tap <b>I paid</b> and send tx hash / transaction id. Order becomes paid only after admin approval.",
  ]
    .filter(Boolean)
    .join("\n");
}
async function createOrderFromDraft(
  ctx: Context,
  comment = "",
) {
  const userId = getUserId(ctx);
  const draft = userId ? drafts.get(userId) : undefined;

  if (!userId || !draft || !draft.recipient) {
    await ctx.reply("Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ. РќР°С‡РЅРёС‚Рµ Р·Р°РЅРѕРІРѕ С‡РµСЂРµР· РєРЅРѕРїРєСѓ В«РљСѓРїРёС‚СЊ Р·РІС‘Р·РґС‹В» РёР»Рё В«РљСѓРїРёС‚СЊ PremiumВ».", {
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

    await ctx.reply(
      [
        "✅ <b>Order created</b>",
        "",
        `Number: <b>${order.orderNumber}</b>`,
        `Recipient: @${order.recipientUsername}`,
        `Amount: <b>${order.totalRub} RUB / ${order.totalUsd} USD</b>`,
        `Status: <b>${order.status}</b>`,
        "",
        "Choose payment method:",
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: paymentMethodInlineKeyboard(order.id),
      },
    );
  } catch (error) {
    logBotApiError("Failed to create bot order", error);
    await ctx.reply(
      "РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Р·Р°РєР°Р·. РњС‹ СѓР¶Рµ Р·Р°РїРёСЃР°Р»Рё РїСЂРёС‡РёРЅСѓ РІ Р»РѕРіР°С… Р±РѕС‚Р°. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р· С‡СѓС‚СЊ РїРѕР·Р¶Рµ РёР»Рё РЅР°РїРёС€РёС‚Рµ РІ РїРѕРґРґРµСЂР¶РєСѓ.",
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
    } else if (payment?.provider === "manual_wallet_transfer" && payment.status !== "paid") {
      keyboard.text(`${order.orderNumber} · I paid`, `manual:paid:${payment.id}`).row();
      hasPaymentButtons = true;
    }
  }

  keyboard.text("Refresh", "orders:list");

  return hasPaymentButtons ? keyboard : storeInlineKeyboard();
}
async function showOrders(ctx: Context) {
  try {
    const { orders } = await listBotOrders(getTelegramUser(ctx));

    if (orders.length === 0) {
      await ctx.reply("РЈ РІР°СЃ РїРѕРєР° РЅРµС‚ Р·Р°РєР°Р·РѕРІ.", { reply_markup: storeInlineKeyboard() });
      return;
    }

    const lines = orders.slice(0, 5).flatMap((order) => [
      `<b>${order.orderNumber}</b>`,
      `РџРѕР»СѓС‡Р°С‚РµР»СЊ: @${order.recipientUsername}`,
      `Amount: ${order.totalRub} RUB / ${order.totalUsd} USD`,
      `РЎС‚Р°С‚СѓСЃ: ${order.status}`,
      order.currentPayment
        ? `РћРїР»Р°С‚Р°: ${order.currentPayment.status} ${order.currentPayment.asset ?? ""}`.trim()
        : "РћРїР»Р°С‚Р°: invoice РµС‰С‘ РЅРµС‚",
      "",
    ]);

    await ctx.reply(["<b>Р’Р°С€Рё РїРѕСЃР»РµРґРЅРёРµ Р·Р°РєР°Р·С‹</b>", "", ...lines].join("\n"), {
      parse_mode: "HTML",
      reply_markup: ordersWithPaymentKeyboard(orders.slice(0, 5)),
    });
  } catch (error) {
    logBotApiError("Failed to load bot orders", error);
    await ctx.reply("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р·Р°РєР°Р·С‹. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р· С‡СѓС‚СЊ РїРѕР·Р¶Рµ.", {
      reply_markup: storeInlineKeyboard(),
    });
  }
}

bot.command("start", async (ctx) => {
  await sendStart(ctx);
});

bot.command("shop", async (ctx) => {
  await ctx.reply("Р’С‹Р±РµСЂРёС‚Рµ, С‡С‚Рѕ С…РѕС‚РёС‚Рµ РєСѓРїРёС‚СЊ:", {
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

bot.hears("РћС‚РєСЂС‹С‚СЊ РјР°РіР°Р·РёРЅ", async (ctx) => {
  await ctx.reply("Р’С‹Р±РµСЂРёС‚Рµ, С‡С‚Рѕ С…РѕС‚РёС‚Рµ РєСѓРїРёС‚СЊ:", { reply_markup: storeInlineKeyboard() });
});

bot.hears("РљСѓРїРёС‚СЊ Р·РІС‘Р·РґС‹", async (ctx) => {
  await startStarsOrder(ctx);
});

bot.hears("РљСѓРїРёС‚СЊ Premium", async (ctx) => {
  await startPremiumOrder(ctx);
});

bot.hears("РњРѕРё Р·Р°РєР°Р·С‹", async (ctx) => {
  await showOrders(ctx);
});

bot.hears("FAQ", async (ctx) => {
  await ctx.reply(faqMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});

bot.hears("РџРѕРґРґРµСЂР¶РєР°", async (ctx) => {
  await ctx.reply(supportMessage, {
    parse_mode: "HTML",
    reply_markup: supportInlineKeyboard(),
  });
});


bot.hears("Buy Stars", async (ctx) => {
  await startStarsOrder(ctx);
});

bot.hears("Buy Premium", async (ctx) => {
  await startPremiumOrder(ctx);
});

bot.hears("My orders", async (ctx) => {
  await showOrders(ctx);
});

bot.hears("Support", async (ctx) => {
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


bot.callbackQuery(/^pay:crypto:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  if (!orderId) return;
  await sendCryptoPaymentOptions(ctx, orderId);
});

bot.callbackQuery(/^pay:wallet:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  if (!orderId) return;
  await sendManualWalletPayment(ctx, orderId);
});

bot.callbackQuery(/^manual:paid:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = getUserId(ctx);
  const paymentId = ctx.match[1];
  if (!userId || !paymentId) {
    return;
  }

  manualPaymentDrafts.set(userId, paymentId);
  await ctx.reply("Send tx hash / transaction id for this transfer. If you do not have it, send '-' and admin will verify manually.");
});
bot.callbackQuery("order:cancel", async (ctx) => {
  const userId = getUserId(ctx);
  if (userId) {
    drafts.delete(userId);
  }

  await ctx.answerCallbackQuery("Р—Р°РєР°Р· РѕС‚РјРµРЅС‘РЅ");
  await ctx.reply("РћС„РѕСЂРјР»РµРЅРёРµ РѕС‚РјРµРЅРµРЅРѕ.", { reply_markup: storeInlineKeyboard() });
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
      await ctx.reply(
        `Payment submitted for order <b>${order.orderNumber}</b>. Status: <b>${order.status}</b>. Admin will verify it manually.`,
        { parse_mode: "HTML", reply_markup: storeInlineKeyboard() },
      );
    } catch (error) {
      logBotApiError("Failed to submit manual wallet payment", error);
      await ctx.reply("Could not submit payment confirmation. Try again or contact support.");
    }
    return;
  }

  const draft = userId ? drafts.get(userId) : undefined;

  if (!userId || !draft) {
    return;
  }

  if (draft.step === "quantity") {
    const quantity = parseStarsQuantity(text);

    if (!quantity) {
      await ctx.reply("Р’РІРµРґРёС‚Рµ С†РµР»РѕРµ С‡РёСЃР»Рѕ РѕС‚ 50 РёР»Рё РІС‹Р±РµСЂРёС‚Рµ РіРѕС‚РѕРІРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ:", {
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
      await ctx.reply("РћС‚РїСЂР°РІСЊС‚Рµ @username РёР»Рё Telegram ID РїРѕР»СѓС‡Р°С‚РµР»СЏ.");
      return;
    }

    drafts.set(userId, { ...draft, recipient, step: "comment" });
    await ctx.reply("РљРѕРјРјРµРЅС‚Р°СЂРёР№ Рє Р·Р°РєР°Р·Сѓ? Р•СЃР»Рё РЅРµ РЅСѓР¶РµРЅ, РЅР°Р¶РјРёС‚Рµ В«РџСЂРѕРїСѓСЃС‚РёС‚СЊВ».", {
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

    await bot.api.setWebhook(
      botWebhookUrl,
      env.BOT_WEBHOOK_SECRET ? { secret_token: env.BOT_WEBHOOK_SECRET } : undefined,
    );
    console.log(`Telegram webhook configured: ${botWebhookUrl}`);

    const app = createHealthApp();
    app.post(
      botWebhookPath,
      express.json(),
      webhookCallback(
        bot,
        "express",
        env.BOT_WEBHOOK_SECRET ? { secretToken: env.BOT_WEBHOOK_SECRET } : undefined,
      ),
    );
    console.log(`Telegram webhook endpoint is listening on POST ${botWebhookPath}`);
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
