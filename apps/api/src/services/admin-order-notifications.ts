import type { Order, OrderItem, Payment, ProductType, User } from "@prisma/client";
import { notifyAdmins } from "./telegram-notifier.js";

type OrderForNotification = Order & {
  items: OrderItem[];
  user?: User;
  payments?: Payment[];
};

type AdminOrderEvent = "created" | "invoice_created" | "manual_payment_created" | "manual_payment_submitted" | "paid" | "cancelled";

const eventTitle: Record<AdminOrderEvent, string> = {
  created: "New order",
  invoice_created: "Crypto invoice created",
  manual_payment_created: "Manual wallet payment created",
  manual_payment_submitted: "Manual wallet payment submitted",
  paid: "Order paid",
  cancelled: "Order cancelled",
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
      `Product: ${formatItem(item)}`,
      `Amount: ${formatOrderAmount(input.order)}`,
      `Buyer: ${formatBuyer(buyer)}`,
      `Recipient: @${escapeHtml(input.order.recipientUsername)}`,
      `Order: <b>${escapeHtml(input.order.status)}</b>`,
      `Payment: ${formatPayment(payment)}`,
    ].join("\n"),
  );
}

function formatItem(item: OrderItem | undefined) {
  if (!item) {
    return "Order";
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
    return "unknown";
  }

  const username = user.username ? ` @${escapeHtml(user.username)}` : "";
  return `${user.telegramId.toString()}${username}`;
}

function formatPayment(payment: Payment | null) {
  if (!payment) {
    return "not created yet";
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
  const lines = [
    network ? `\nNetwork: ${escapeHtml(network)}` : "",
    address ? `\nAddress: <code>${escapeHtml(address)}</code>` : "",
    txHash ? `\nTx: <code>${escapeHtml(txHash)}</code>` : "",
  ];
  return lines.join("");
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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
