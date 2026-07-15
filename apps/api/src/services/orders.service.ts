import { Prisma, type OrderStatus, type ProductType, type User } from "@prisma/client";
import type { CreateOrderRequest } from "@suupstars/shared";
import { calculatePremiumPrice, calculateStarsPrice } from "@suupstars/shared";
import { prisma } from "../db/prisma.js";
import { assertFound, ApiError } from "../lib/http.js";
import { notifyAdmins, notifyUser } from "./telegram-notifier.js";

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
});

const adminOrderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  user: true,
});

function makeOrderNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SS-${stamp}-${random}`;
}

function getPrice(input: CreateOrderRequest) {
  if (input.productType === "stars") {
    return calculateStarsPrice(input.quantity);
  }

  return calculatePremiumPrice();
}

export async function createOrder(input: CreateOrderRequest, user: User) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: orderInclude,
  });

  if (existing) {
    return existing;
  }

  const product = assertFound(
    await prisma.product.findUnique({ where: { type: input.productType } }),
    "Товар не найден",
  );

  if (!product.isActive) {
    throw new ApiError(400, "Товар временно недоступен", "PRODUCT_INACTIVE");
  }

  const quantity = input.productType === "stars" ? input.quantity : 1;
  const price = getPrice(input);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        userId: user.id,
        status: "awaiting_payment",
        recipientUsername: input.recipient.username,
        comment: input.comment,
        totalRub: price.totalRub,
        totalUsd: price.totalUsd,
        idempotencyKey: input.idempotencyKey,
        items: {
          create: {
            productId: product.id,
            productType: product.type,
            title: product.title,
            quantity,
            unitRub: product.priceRub,
            unitUsd: product.priceUsd,
            totalRub: price.totalRub,
            totalUsd: price.totalUsd,
          },
        },
        statusHistory: {
          create: {
            status: "awaiting_payment",
            note: "Заказ создан, ожидает подтверждения оплаты.",
            actorTelegramId: user.telegramId,
          },
        },
      },
      include: orderInclude,
    });

    return created;
  });

  void notifyOrderCreated(order.orderNumber, user.telegramId, user.username, price).catch((error) => {
    console.error(`Order ${order.orderNumber} was created, but Telegram notifications failed`, error);
  });

  return order;
}

async function notifyOrderCreated(
  orderNumber: string,
  telegramId: bigint,
  username: string | null,
  price: { totalRub: number; totalUsd: number },
) {
  await Promise.all([
    notifyUser(
      telegramId,
      `Заказ <b>${orderNumber}</b> создан.\nСтатус: ожидает подтверждения оплаты.`,
    ),
    notifyAdmins(
      `Новый заказ <b>${orderNumber}</b>\nПользователь: ${username ?? telegramId.toString()}\nСумма: ${price.totalRub} RUB / ${price.totalUsd} USD`,
    ),
  ]);
}

export async function listUserOrders(user: User) {
  return prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
}

export async function getUserOrder(orderId: string, user: User) {
  return assertFound(
    await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: orderInclude,
    }),
    "Заказ не найден",
  );
}

export async function cancelUserOrder(orderId: string, user: User) {
  const order = await getUserOrder(orderId, user);

  if (!["pending", "awaiting_payment"].includes(order.status)) {
    throw new ApiError(400, "Этот заказ уже нельзя отменить", "ORDER_NOT_CANCELLABLE");
  }

  return updateOrderStatus(order.id, "cancelled", user, "Заказ отменен пользователем");
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor: User,
  note?: string,
) {
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note: note ?? null,
            actorTelegramId: actor.telegramId,
          },
        },
      },
      include: adminOrderInclude,
    });

    if (actor.isAdmin) {
      await tx.adminAction.create({
        data: {
          orderId,
          adminId: actor.id,
          action: `status:${status}`,
          note: note ?? null,
        },
      });
    }

    return updated;
  });

  await notifyUser(
    order.user.telegramId,
    `Статус заказа <b>${order.orderNumber}</b> изменен: <b>${status}</b>${note ? `\n${note}` : ""}`,
  );

  if (status === "completed") {
    await notifyUser(order.user.telegramId, `Заказ <b>${order.orderNumber}</b> выполнен. Спасибо!`);
  }

  return order;
}

export async function listAdminOrders(params: { status?: OrderStatus | undefined; take: number; cursor?: string | undefined }) {
  return prisma.order.findMany({
    ...(params.status ? { where: { status: params.status } } : {}),
    take: params.take,
    skip: params.cursor ? 1 : 0,
    ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: adminOrderInclude,
  });
}

export async function getAdminOrder(orderId: string) {
  return assertFound(
    await prisma.order.findUnique({
      where: { id: orderId },
      include: adminOrderInclude,
    }),
    "Заказ не найден",
  );
}

export async function updateInternalNote(orderId: string, admin: User, internalNote: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { internalNote },
      include: adminOrderInclude,
    });

    await tx.adminAction.create({
      data: {
        orderId,
        adminId: admin.id,
        action: "internal_note:update",
        note: internalNote,
      },
    });

    return updated;
  });
}

export function productTypeLabel(productType: ProductType) {
  return productType === "stars" ? "Telegram Stars" : "Telegram Premium";
}
