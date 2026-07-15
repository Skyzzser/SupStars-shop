import type { Order, OrderItem, OrderStatusHistory, Payment, Product, User } from "@prisma/client";
import type { AdminOrderDto, OrderDto, ProductDto } from "@suupstars/shared";

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
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    recipientUsername: order.recipientUsername,
    comment: order.comment,
    internalNote: order.internalNote,
    totalRub: order.totalRub.toNumber(),
    totalUsd: order.totalUsd.toNumber(),
    items: order.items.map((item) => ({
      id: item.id,
      productType: item.productType,
      title: item.title,
      quantity: item.quantity,
      totalRub: item.totalRub.toNumber(),
      totalUsd: item.totalUsd.toNumber(),
    })),
    payments: order.payments.map((payment) => ({
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
    })),
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
