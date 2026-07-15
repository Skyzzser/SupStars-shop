import { InlineKeyboard, Keyboard } from "grammy";
import { appUrl, canUseTelegramWebApp, env } from "./env.js";

export function mainReplyKeyboard() {
  return new Keyboard()
    .text("Открыть магазин")
    .row()
    .text("Купить звёзды")
    .text("Купить Premium")
    .row()
    .text("Мои заказы")
    .text("Поддержка")
    .text("FAQ")
    .resized();
}

export function storeInlineKeyboard() {
  const keyboard = new InlineKeyboard()
    .text("Купить звёзды", "buy:stars")
    .text("Купить Premium", "buy:premium")
    .row()
    .text("Мои заказы", "orders:list")
    .text("FAQ", "faq:open");

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

export function cryptoInvoiceInlineKeyboard(payments: Array<{ asset: string | null; payUrl: string | null }>) {
  const keyboard = new InlineKeyboard();

  for (const payment of payments) {
    if (payment.asset && payment.payUrl) {
      keyboard.url(`Оплатить ${payment.asset}`, payment.payUrl).row();
    }
  }

  keyboard.text("Мои заказы", "orders:list").text("FAQ", "faq:open");

  return keyboard;
}

export function supportInlineKeyboard() {
  const keyboard = canUseTelegramWebApp()
    ? new InlineKeyboard().webApp("FAQ в Mini App", appUrl("/support"))
    : new InlineKeyboard().url("FAQ на сайте", appUrl("/support"));

  if (env.SUPPORT_URL) {
    keyboard.row().url("Написать в поддержку", env.SUPPORT_URL);
  }

  return keyboard;
}
