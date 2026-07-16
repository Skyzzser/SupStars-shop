import { InlineKeyboard, Keyboard } from "grammy";
import { appUrl, canUseTelegramWebApp, env } from "./env.js";

export function mainReplyKeyboard() {
  return new Keyboard()
    .text("Buy Stars")
    .text("Buy Premium")
    .row()
    .text("My orders")
    .text("Support")
    .resized();
}

export function storeInlineKeyboard() {
  const keyboard = new InlineKeyboard()
    .text("Buy Stars", "buy:stars")
    .text("Buy Premium", "buy:premium")
    .row()
    .text("My orders", "orders:list");

  if (canUseTelegramWebApp()) {
    keyboard.row().webApp("Open Mini App", appUrl("/"));
  }

  return keyboard;
}

export function quantityInlineKeyboard() {
  return new InlineKeyboard()
    .text("50", "qty:50")
    .text("100", "qty:100")
    .text("250", "qty:250")
    .row()
    .text("500", "qty:500")
    .text("1000", "qty:1000")
    .row()
    .text("Cancel", "order:cancel");
}

export function commentInlineKeyboard() {
  return new InlineKeyboard().text("Skip", "comment:skip").text("Cancel", "order:cancel");
}

export function paymentMethodInlineKeyboard(orderId: string) {
  const keyboard = new InlineKeyboard()
    .text("Crypto Bot", `pay:crypto:${orderId}`)
    .text("Wallet transfer", `pay:wallet:${orderId}`)
    .row();

  if (canUseTelegramWebApp()) {
    keyboard.webApp("Open payment page", appUrl(`/checkout/payment?orderId=${orderId}`)).row();
  }

  keyboard.text("My orders", "orders:list");
  return keyboard;
}

export function cryptoInvoiceInlineKeyboard(payments: Array<{ asset: string | null; payUrl: string | null }>) {
  const keyboard = new InlineKeyboard();

  for (const payment of payments) {
    if (payment.asset && payment.payUrl) {
      keyboard.url(`Pay ${payment.asset}`, payment.payUrl).row();
    }
  }

  keyboard.text("My orders", "orders:list");

  return keyboard;
}

export function manualWalletInlineKeyboard(paymentId: string) {
  return new InlineKeyboard()
    .text("I paid", `manual:paid:${paymentId}`)
    .row()
    .text("My orders", "orders:list");
}

export function supportInlineKeyboard() {
  const keyboard = canUseTelegramWebApp()
    ? new InlineKeyboard().webApp("FAQ in Mini App", appUrl("/support"))
    : new InlineKeyboard().url("FAQ", appUrl("/support"));

  if (env.SUPPORT_URL) {
    keyboard.row().url("Contact support", env.SUPPORT_URL);
  }

  return keyboard;
}
