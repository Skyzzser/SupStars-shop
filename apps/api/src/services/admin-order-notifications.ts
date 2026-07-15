import type { Order, OrderItem, Payment, ProductType, User } from "@prisma/client";
import { notifyAdmins } from "./telegram-notifier.js";

type OrderForNotification = Order & {
  items: OrderItem[];
  user?: User;
  payments?: Payment[];
};

type AdminOrderEvent = "created" | "invoice_created" | "paid" | "cancelled";

const eventTitle: Record<AdminOrderEvent, string> = {
  created: "🆕 Новый заказ",
  invoice_created: "🧾 Создан invoice",
  paid: "✅ Заказ оплачен",
  cancelled: "🚫 Заказ отменён",
};

export async function notifyAdminsAboutOrderEvent(input: {
  event: AdminOrderEvent;
  order: OrderForNotification;
  buyer?: User;
  payment?: Payment | null;
}) {
  const buyer = input.buyer ?? input.order.user;
  const item = input.order.items[0];
  const payment = input.payment ?? input.order.payments?.[0] ?? null;

  await notifyAdmins(
    [
      `<b>${eventTitle[input.event]}</b>`,
      `ID: <b>${escapeHtml(input.order.orderNumber)}</b>`,
      `Товар: ${formatItem(item)}`,
      `Сумма: ${formatOrderAmount(input.order)}`,
      `Покупатель: ${formatBuyer(buyer)}`,
      `Получатель: @${escapeHtml(input.order.recipientUsername)}`,
      `Заказ: <b>${escapeHtml(input.order.status)}</b>`,
      `Оплата: ${formatPayment(payment)}`,
    ].join("\n"),
  );
}

function formatItem(item: OrderItem | undefined) {
  if (!item) {
    return "Заказ";
  }

  const quantity = item.productType === "stars" ? ` x${item.quantity}` : "";
  return `${productTypeLabel(item.productType)}${quantity}`;
}

function formatOrderAmount(order: Order) {
  const rub = `${order.totalRub.toString()} RUB`;
  const usd = order.totalUsd.toNumber() > 0 ? ` / ${order.totalUsd.toString()} USD` : "";
  return `${rub}${usd}`;
}

function formatBuyer(user: User | undefined) {
  if (!user) {
    return "неизвестен";
  }

  const username = user.username ? ` @${escapeHtml(user.username)}` : "";
  return `${user.telegramId.toString()}${username}`;
}

function formatPayment(payment: Payment | null) {
  if (!payment) {
    return "invoice ещё нет";
  }

  const asset = payment.asset ? ` ${escapeHtml(payment.asset)}` : "";
  const amount = payment.amount ? ` ${payment.amount.toString()}` : "";
  const invoice = payment.providerPaymentId ? ` #${escapeHtml(payment.providerPaymentId)}` : "";
  return `<b>${escapeHtml(payment.status)}</b>${asset}${amount}${invoice}`;
}

function productTypeLabel(productType: ProductType) {
  return productType === "stars" ? "Telegram Stars" : "Telegram Premium";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
