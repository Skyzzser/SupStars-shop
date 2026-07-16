import { Prisma, type OrderStatus, type ProductType, type User } from "@prisma/client";
import type { CreateOrderRequest } from "@suupstars/shared";
import { calculatePremiumPrice, calculateStarsPrice } from "@suupstars/shared";
import { prisma } from "../db/prisma.js";
import { assertFound, ApiError } from "../lib/http.js";
import { notifyAdminsAboutOrderEvent } from "./admin-order-notifications.js";
import { notifyUser } from "./telegram-notifier.js";

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

type UserOrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

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
    "РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ",
  );

  if (!product.isActive) {
    throw new ApiError(400, "РўРѕРІР°СЂ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ", "PRODUCT_INACTIVE");
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
            totalRub: price.subtotalRub,
            totalUsd: price.subtotalUsd,
          },
        },
        statusHistory: {
          create: {
            status: "awaiting_payment",
            note: "Р—Р°РєР°Р· СЃРѕР·РґР°РЅ, РѕР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РѕРїР»Р°С‚С‹.",
            actorTelegramId: user.telegramId,
          },
        },
      },
      include: orderInclude,
    });

    return created;
  });

  void notifyOrderCreated(order, user).catch((error) => {
    console.error(`Order ${order.orderNumber} was created, but Telegram notifications failed`, error);
  });

  return order;
}

async function notifyOrderCreated(order: UserOrderWithRelations, user: User) {
  await Promise.all([
    notifyUser(
      user.telegramId,
      `Р—Р°РєР°Р· <b>${order.orderNumber}</b> СЃРѕР·РґР°РЅ.\nРЎС‚Р°С‚СѓСЃ: РѕР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РѕРїР»Р°С‚С‹.`,
    ),
    notifyAdminsAboutOrderEvent({ event: "created", order, buyer: user }),
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
    "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ",
  );
}

export async function cancelUserOrder(orderId: string, user: User) {
  const order = await getUserOrder(orderId, user);

  if (!["pending", "awaiting_payment"].includes(order.status)) {
    throw new ApiError(400, "Р­С‚РѕС‚ Р·Р°РєР°Р· СѓР¶Рµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ", "ORDER_NOT_CANCELLABLE");
  }

  return updateOrderStatus(order.id, "cancelled", user, "Р—Р°РєР°Р· РѕС‚РјРµРЅРµРЅ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј");
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
    `РЎС‚Р°С‚СѓСЃ Р·Р°РєР°Р·Р° <b>${order.orderNumber}</b> РёР·РјРµРЅРµРЅ: <b>${status}</b>${note ? `\n${note}` : ""}`,
  );

  if (status === "completed") {
    await notifyUser(order.user.telegramId, `Р—Р°РєР°Р· <b>${order.orderNumber}</b> РІС‹РїРѕР»РЅРµРЅ. РЎРїР°СЃРёР±Рѕ!`);
  }

  if (status === "cancelled" || status === "paid") {
    await notifyAdminsAboutOrderEvent({
      event: status === "cancelled" ? "cancelled" : "paid",
      order,
      buyer: order.user,
    });
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
    "Р—Р°РєР°Р· РЅРµ РЅР°Р№РґРµРЅ",
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
