import { InlineKeyboard, Keyboard } from "grammy";
import { appUrl, canUseTelegramWebApp, env } from "./env.js";

export function mainReplyKeyboard() {
  return new Keyboard()
    .text("Купить Stars")
    .text("Купить Premium")
    .row()
    .text("Мои заказы")
    .text("Поддержка")
    .resized();
}

export function storeInlineKeyboard() {
  const keyboard = new InlineKeyboard()
    .text("Купить Stars", "buy:stars")
    .text("Купить Premium", "buy:premium")
    .row()
    .text("Мои заказы", "orders:list");

  if (canUseTelegramWebApp()) {
    keyboard.row().webApp("Открыть Mini App", appUrl("/"));
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
    .text("Отмена", "order:cancel");
}

export function commentInlineKeyboard() {
  return new InlineKeyboard().text("Пропустить", "comment:skip").text("Отмена", "order:cancel");
}

export function paymentMethodInlineKeyboard(orderId: string) {
  const keyboard = new InlineKeyboard()
    .text("Crypto Bot", `pay:crypto:${orderId}`)
    .text("Перевод на кошелек", `pay:wallet:${orderId}`)
    .row();

  if (canUseTelegramWebApp()) {
    keyboard.webApp("Открыть оплату", appUrl(`/checkout/payment?orderId=${orderId}`)).row();
  }

  keyboard.text("Мои заказы", "orders:list");
  return keyboard;
}

export function cryptoInvoiceInlineKeyboard(payments: Array<{ asset: string | null; payUrl: string | null }>) {
  const keyboard = new InlineKeyboard();

  for (const payment of payments) {
    if (payment.asset && payment.payUrl) {
      keyboard.url(`Оплатить ${payment.asset}`, payment.payUrl).row();
    }
  }

  keyboard.text("Мои заказы", "orders:list");
  return keyboard;
}

export function manualWalletInlineKeyboard(paymentId: string) {
  return new InlineKeyboard()
    .text("Я оплатил", `manual:paid:${paymentId}`)
    .row()
    .text("Мои заказы", "orders:list");
}

export function supportInlineKeyboard() {
  const keyboard = canUseTelegramWebApp()
    ? new InlineKeyboard().webApp("FAQ в Mini App", appUrl("/support"))
    : new InlineKeyboard().url("FAQ", appUrl("/support"));

  if (env.SUPPORT_URL) {
    keyboard.row().url("Написать в поддержку", env.SUPPORT_URL);
  }

  return keyboard;
}
