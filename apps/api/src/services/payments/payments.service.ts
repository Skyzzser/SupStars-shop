import { Prisma, type Payment, type User } from "@prisma/client";
import type { CryptoAsset } from "@suupstars/shared";
import { prisma } from "../../db/prisma.js";
import { assertFound, ApiError } from "../../lib/http.js";
import { notifyAdminsAboutOrderEvent } from "../admin-order-notifications.js";
import { notifyUser } from "../telegram-notifier.js";
import { CryptoBotPaymentProvider } from "./crypto-bot-provider.js";
import { CRYPTO_BOT_PROVIDER, type CryptoWebhookUpdate } from "./types.js";

const paymentOrderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
});

const paymentOrderWithUserInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  user: true,
});

const cryptoBotProvider = new CryptoBotPaymentProvider();

export async function createCryptoInvoice(input: { orderId: string; asset: CryptoAsset; user: User }) {
  const order = assertFound(
    await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.user.id },
      include: paymentOrderInclude,
    }),
    "Order not found",
  );

  if (["paid", "processing", "completed", "cancelled", "refunded"].includes(order.status)) {
    throw new ApiError(400, "This order cannot be paid", "ORDER_NOT_PAYABLE");
  }

  const reusablePayment = order.payments.find(
    (payment) =>
      payment.provider === CRYPTO_BOT_PROVIDER &&
      payment.asset === input.asset &&
      ["active", "pending"].includes(payment.status) &&
      Boolean(payment.payUrl),
  );

  if (reusablePayment) {
    return {
      order,
      payment: reusablePayment,
    };
  }

  const invoice = await cryptoBotProvider.createInvoice({ order, asset: input.asset });

  const created = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: invoice.provider,
      providerPaymentId: invoice.providerPaymentId,
      status: normalizePaymentStatus(invoice.status),
      asset: invoice.asset,
      amount: new Prisma.Decimal(invoice.amount),
      payUrl: invoice.payUrl,
      amountRub: order.totalRub,
      amountUsd: order.totalUsd,
      payload: invoice.payload as Prisma.InputJsonValue,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "awaiting_payment",
      providerName: CRYPTO_BOT_PROVIDER,
      providerPayload: {
        lastPaymentId: created.id,
        asset: input.asset,
        providerPaymentId: invoice.providerPaymentId,
      },
    },
    include: paymentOrderInclude,
  });

  void notifyAdminsAboutOrderEvent({
    event: "invoice_created",
    order: updatedOrder,
    buyer: input.user,
    payment: created,
  }).catch((error) => {
    console.error(`Crypto invoice ${created.providerPaymentId} was created, but admin notification failed`, error);
  });

  return {
    order: updatedOrder,
    payment: created,
  };
}

export async function confirmCryptoWebhook(input: {
  rawBody: Buffer;
  signature: string | undefined;
  secret: string | undefined;
}) {
  const update = cryptoBotProvider.verifyWebhook(input);

  if (update.update_type !== "invoice_paid") {
    return { accepted: true, ignored: true };
  }

  const invoice = update.payload;
  if (invoice.status !== "paid") {
    return { accepted: true, ignored: true };
  }

  const payment = assertFound(
    await prisma.payment.findFirst({
      where: {
        provider: CRYPTO_BOT_PROVIDER,
        providerPaymentId: invoice.invoice_id.toString(),
      },
      include: { order: { include: { user: true } } },
    }),
    "Payment not found",
  );

  const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        rawWebhookPayload: update as unknown as Prisma.InputJsonValue,
        paidAt,
      },
    });

    if (payment.order.status === "paid" || payment.order.status === "processing" || payment.order.status === "completed") {
      return { payment: updatedPayment, order: null, alreadyPaid: true as const };
    }

    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: "paid",
        statusHistory: {
          create: {
            status: "paid",
            note: `Crypto Pay invoice ${invoice.invoice_id} paid in ${invoice.asset ?? payment.asset ?? "crypto"}.`,
          },
        },
      },
      include: paymentOrderWithUserInclude,
    });

    return { payment: updatedPayment, order, alreadyPaid: false as const };
  });

  if (!updated.alreadyPaid && updated.order) {
    await notifyPaymentSuccess(updated.order, updated.payment, update);
  }

  return { accepted: true, ignored: false };
}

export function paymentToPublicDto(payment: Payment) {
  return {
    id: payment.id,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    asset: payment.asset === "USDT" || payment.asset === "TON" ? payment.asset : null,
    amount: payment.amount?.toNumber() ?? null,
    payUrl: payment.payUrl,
    amountRub: payment.amountRub.toNumber(),
    amountUsd: payment.amountUsd.toNumber(),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function normalizePaymentStatus(status: string) {
  if (status === "active" || status === "paid" || status === "expired") {
    return status;
  }

  return "pending";
}

async function notifyPaymentSuccess(
  order: Prisma.OrderGetPayload<{ include: typeof paymentOrderWithUserInclude }>,
  payment: Payment,
  update: CryptoWebhookUpdate,
) {
  const asset = update.payload.asset ?? payment.asset ?? "crypto";
  const amount = update.payload.amount ?? payment.amount?.toString() ?? "";

  await Promise.all([
    notifyUser(
      order.user.telegramId,
      `✅ Оплата получена\n\nЗаказ: <b>${order.orderNumber}</b>\nСумма: <b>${amount} ${asset}</b>\nСтатус: <b>paid</b>`,
    ),
    notifyAdminsAboutOrderEvent({
      event: "paid",
      order,
      buyer: order.user,
      payment,
    }),
  ]);
}
