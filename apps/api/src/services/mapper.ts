import type { Order, OrderItem, OrderStatusHistory, Payment, Product, User } from "@prisma/client";
import type { AdminOrderDto, ManualWalletPaymentDetailsDto, OrderDto, PaymentDto, ProductDto } from "@suupstars/shared";
import { makePricingBreakdown } from "@suupstars/shared";

const manualWalletProvider = "manual_wallet_transfer";

type OrderWithRelations = Order & {
  items: OrderItem[];
  payments: Payment[];
  statusHistory: OrderStatusHistory[];
};

type AdminOrderWithRelations = OrderWithRelations & {
  user: User;
};

export function productToDto(product: Product): ProductDto {
  return {
    id: product.id,
    type: product.type,
    title: product.title,
    description: product.description,
    minQuantity: product.minQuantity,
    priceRub: product.priceRub.toNumber(),
    priceUsd: product.priceUsd.toNumber(),
    isActive: product.isActive,
  };
}

export function orderToDto(order: OrderWithRelations): OrderDto {
  const payments = order.payments.map(paymentToDto);
  const subtotalRub = order.items.reduce((sum, item) => sum + item.totalRub.toNumber(), 0);
  const subtotalUsd = order.items.reduce((sum, item) => sum + item.totalUsd.toNumber(), 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    recipientUsername: order.recipientUsername,
    comment: order.comment,
    internalNote: order.internalNote,
    totalRub: order.totalRub.toNumber(),
    totalUsd: order.totalUsd.toNumber(),
    pricing: makePricingBreakdown({
      subtotalRub,
      subtotalUsd,
      totalRub: order.totalRub.toNumber(),
      totalUsd: order.totalUsd.toNumber(),
    }),
    items: order.items.map((item) => ({
      id: item.id,
      productType: item.productType,
      title: item.title,
      quantity: item.quantity,
      totalRub: item.totalRub.toNumber(),
      totalUsd: item.totalUsd.toNumber(),
    })),
    payments,
    currentPayment:
      payments.find((payment) => ["active", "pending", "awaiting_manual_verification"].includes(payment.status) && (Boolean(payment.payUrl) || Boolean(payment.manualWallet))) ??
      payments[0] ??
      null,
    statusHistory: order.statusHistory.map((entry) => ({
      id: entry.id,
      status: entry.status,
      note: entry.note,
      actorTelegramId: entry.actorTelegramId?.toString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function paymentToDto(payment: Payment): PaymentDto {
  return {
    id: payment.id,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    asset: payment.asset,
    amount: payment.amount?.toNumber() ?? null,
    payUrl: payment.payUrl,
    amountRub: payment.amountRub.toNumber(),
    amountUsd: payment.amountUsd.toNumber(),
    manualWallet: payment.provider === manualWalletProvider ? readManualWalletPayload(payment.payload) : null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function readManualWalletPayload(payload: unknown): ManualWalletPaymentDetailsDto | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const network = readString(value.network);
  const asset = readString(value.asset);
  const address = readString(value.address);

  if (!network || !asset || !address) {
    return null;
  }

  return {
    network,
    asset,
    address,
    memo: readString(value.memo),
    txHash: readString(value.txHash),
    instructions: readString(value.instructions),
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function adminOrderToDto(order: AdminOrderWithRelations): AdminOrderDto {
  return {
    ...orderToDto(order),
    user: {
      telegramId: order.user.telegramId.toString(),
      username: order.user.username,
      firstName: order.user.firstName,
    },
  };
}
