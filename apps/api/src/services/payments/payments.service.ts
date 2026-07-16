import { Prisma, type Payment, type User } from "@prisma/client";
import type { CryptoAsset } from "@suupstars/shared";
import { prisma } from "../../db/prisma.js";
import { assertFound, ApiError } from "../../lib/http.js";
import { paymentToDto } from "../mapper.js";
import { notifyAdminsAboutOrderEvent } from "../admin-order-notifications.js";
import { notifyUser } from "../telegram-notifier.js";
import { CryptoBotPaymentProvider } from "./crypto-bot-provider.js";
import { ManualWalletTransferProvider, mergeManualWalletPayload } from "./manual-wallet-provider.js";
import { CRYPTO_BOT_PROVIDER, MANUAL_WALLET_PROVIDER, type CryptoWebhookUpdate } from "./types.js";

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
const manualWalletProvider = new ManualWalletTransferProvider();

const terminalOrderStatuses = ["paid", "processing", "completed", "cancelled", "refunded"];
const activeManualStatuses = ["pending", "awaiting_manual_verification"];

export async function createCryptoInvoice(input: { orderId: string; asset: CryptoAsset; user: User }) {
  const order = assertFound(
    await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.user.id },
      include: paymentOrderInclude,
    }),
    "Order not found",
  );

  assertOrderPayable(order.status);

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

export async function createManualWalletPayment(input: { orderId: string; user: User }) {
  const order = assertFound(
    await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.user.id },
      include: paymentOrderInclude,
    }),
    "Order not found",
  );

  assertOrderPayable(order.status);

  const reusablePayment = order.payments.find(
    (payment) => payment.provider === MANUAL_WALLET_PROVIDER && activeManualStatuses.includes(payment.status),
  );

  if (reusablePayment) {
    return { order, payment: reusablePayment };
  }

  const session = manualWalletProvider.createPaymentSession({ order });

  const created = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: session.provider,
      providerPaymentId: session.providerPaymentId,
      status: session.status,
      asset: session.asset,
      amount: new Prisma.Decimal(session.amount),
      payUrl: null,
      amountRub: order.totalRub,
      amountUsd: order.totalUsd,
      payload: session.payload as Prisma.InputJsonValue,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "awaiting_payment",
      providerName: MANUAL_WALLET_PROVIDER,
      providerPayload: { lastPaymentId: created.id },
    },
    include: paymentOrderInclude,
  });

  void notifyAdminsAboutOrderEvent({
    event: "manual_payment_created",
    order: updatedOrder,
    buyer: input.user,
    payment: created,
  }).catch((error) => {
    console.error(`Manual payment ${created.id} was created, but admin notification failed`, error);
  });

  return { order: updatedOrder, payment: created };
}

export async function confirmManualWalletPayment(input: { paymentId: string; txHash?: string; user: User }) {
  const payment = assertFound(
    await prisma.payment.findFirst({
      where: {
        id: input.paymentId,
        provider: MANUAL_WALLET_PROVIDER,
        order: { userId: input.user.id },
      },
      include: { order: { include: { user: true } } },
    }),
    "Manual payment not found",
  );

  if (payment.status === "paid") {
    throw new ApiError(400, "Payment is already paid", "PAYMENT_ALREADY_PAID");
  }

  if (payment.status === "rejected" || payment.status === "failed") {
    throw new ApiError(400, "Payment was rejected", "PAYMENT_REJECTED");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "awaiting_manual_verification",
        payload: mergeManualWalletPayload(payment.payload, {
          txHash: input.txHash?.trim() || undefined,
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: "awaiting_manual_verification",
        providerName: MANUAL_WALLET_PROVIDER,
        providerPayload: { lastPaymentId: payment.id },
        statusHistory: {
          create: {
            status: "awaiting_manual_verification",
            note: input.txHash ? `Manual wallet transfer submitted: ${input.txHash}` : "Manual wallet transfer submitted.",
            actorTelegramId: input.user.telegramId,
          },
        },
      },
      include: paymentOrderWithUserInclude,
    });

    return { order, payment: updatedPayment };
  });

  await Promise.all([
    notifyUser(
      input.user.telegramId,
      `Payment for order <b>${updated.order.orderNumber}</b> is waiting for admin verification.`,
    ),
    notifyAdminsAboutOrderEvent({
      event: "manual_payment_submitted",
      order: updated.order,
      buyer: input.user,
      payment: updated.payment,
    }),
  ]);

  return updated;
}

export async function verifyManualWalletPayment(input: {
  paymentId: string;
  action: "approve" | "reject";
  note?: string | undefined;
  admin: User;
}) {
  const payment = assertFound(
    await prisma.payment.findFirst({
      where: { id: input.paymentId, provider: MANUAL_WALLET_PROVIDER },
      include: { order: { include: { user: true } } },
    }),
    "Manual payment not found",
  );

  if (payment.status === "paid" && input.action === "approve") {
    throw new ApiError(400, "Payment is already paid", "PAYMENT_ALREADY_PAID");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data:
        input.action === "approve"
          ? { status: "paid", paidAt: now }
          : {
              status: "rejected",
              payload: mergeManualWalletPayload(payment.payload, {
                rejectedAt: now.toISOString(),
                rejectionNote: input.note,
              }),
            },
    });

    const orderStatus = input.action === "approve" ? "paid" : "awaiting_payment";
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: orderStatus,
        statusHistory: {
          create: {
            status: orderStatus,
            note:
              input.note ??
              (input.action === "approve" ? "Manual wallet transfer approved by admin." : "Manual wallet transfer rejected by admin."),
            actorTelegramId: input.admin.telegramId,
          },
        },
      },
      include: paymentOrderWithUserInclude,
    });

    await tx.adminAction.create({
      data: {
        orderId: payment.orderId,
        adminId: input.admin.id,
        action: `manual_payment:${input.action}`,
        note: input.note ?? null,
      },
    });

    return { order, payment: updatedPayment };
  });

  if (input.action === "approve") {
    await Promise.all([
      notifyUser(
        updated.order.user.telegramId,
        `Manual payment for order <b>${updated.order.orderNumber}</b> is approved. Status: <b>paid</b>.`,
      ),
      notifyAdminsAboutOrderEvent({ event: "paid", order: updated.order, buyer: updated.order.user, payment: updated.payment }),
    ]);
  } else {
    await notifyUser(
      updated.order.user.telegramId,
      `Manual payment for order <b>${updated.order.orderNumber}</b> was rejected.${input.note ? `\n${input.note}` : ""}`,
    );
  }

  return updated;
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
  return paymentToDto(payment);
}

function assertOrderPayable(status: string) {
  if (terminalOrderStatuses.includes(status)) {
    throw new ApiError(400, "This order cannot be paid", "ORDER_NOT_PAYABLE");
  }
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
      `Payment received\n\nOrder: <b>${order.orderNumber}</b>\nAmount: <b>${amount} ${asset}</b>\nStatus: <b>paid</b>`,
    ),
    notifyAdminsAboutOrderEvent({
      event: "paid",
      order,
      buyer: order.user,
      payment,
    }),
  ]);
}
