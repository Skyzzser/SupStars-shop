import type { Order, OrderItem, Payment, ProductType, User } from "@prisma/client";
import { notifyAdmins, type TelegramReplyMarkup } from "./telegram-notifier.js";

type OrderForNotification = Order & {
  items: OrderItem[];
  user?: User;
  payments?: Payment[];
};

type AdminOrderEvent = "created" | "invoice_created" | "manual_payment_created" | "manual_payment_submitted" | "paid" | "cancelled";

const eventTitle: Record<AdminOrderEvent, string> = {
  created: "Новый заказ",
  invoice_created: "Создан счет Crypto Bot",
  manual_payment_created: "Создан ручной перевод",
  manual_payment_submitted: "Покупатель отметил перевод как оплаченный",
  paid: "Заказ оплачен",
  cancelled: "Заказ отменен",
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
      `Заказ: <b>${escapeHtml(input.order.orderNumber)}</b>`,
      payment ? `Payment ID: <code>${escapeHtml(payment.id)}</code>` : "",
      `Товар: ${formatItem(item)}`,
      `Сумма: ${formatOrderAmount(input.order)}`,
      `Покупатель: ${formatBuyer(buyer)}`,
      `Получатель: @${escapeHtml(input.order.recipientUsername)}`,
      `Статус заказа: <b>${escapeHtml(input.order.status)}</b>`,
      `Оплата: ${formatPayment(payment)}`,
    ]
      .filter(Boolean)
      .join("\n"),
    buildManualPaymentActions(payment),
  );
}

function buildManualPaymentActions(payment: Payment | null): TelegramReplyMarkup | undefined {
  if (!payment || payment.provider !== "manual_wallet_transfer" || payment.status !== "awaiting_manual_verification") {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        { text: "Подтвердить оплату", callback_data: `admin:manual:approve:${payment.id}` },
        { text: "Отклонить", callback_data: `admin:manual:reject:${payment.id}` },
      ],
    ],
  };
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
    return "еще не создана";
  }

  const asset = payment.asset ? ` ${escapeHtml(payment.asset)}` : "";
  const amount = payment.amount ? ` ${payment.amount.toString()}` : "";
  const reference = payment.providerPaymentId ? ` #${escapeHtml(payment.providerPaymentId)}` : "";
  const manual = payment.provider === "manual_wallet_transfer" ? formatManualPayload(payment.payload) : "";
  return `<b>${escapeHtml(payment.status)}</b> ${escapeHtml(payment.provider)}${asset}${amount}${reference}${manual}`;
}

function formatManualPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const value = payload as Record<string, unknown>;
  const network = readString(value.network);
  const address = readString(value.address);
  const txHash = readString(value.txHash);
  return [
    network ? `\nСеть: ${escapeHtml(network)}` : "",
    address ? `\nАдрес: <code>${escapeHtml(address)}</code>` : "",
    txHash ? `\nTx: <code>${escapeHtml(txHash)}</code>` : "",
  ].join("");
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function productTypeLabel(productType: ProductType) {
  return productType === "stars" ? "Telegram Stars" : "Telegram Premium";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
