import type { OrderStatus, ProductType } from "./schemas.js";

export type ProductDto = {
  id: string;
  type: ProductType;
  title: string;
  description: string;
  minQuantity: number | null;
  priceRub: number;
  priceUsd: number;
  isActive: boolean;
};

export type OrderItemDto = {
  id: string;
  productType: ProductType;
  title: string;
  quantity: number;
  totalRub: number;
  totalUsd: number;
};

export type OrderStatusHistoryDto = {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  actorTelegramId: string | null;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  recipientUsername: string;
  comment: string | null;
  internalNote?: string | null;
  totalRub: number;
  totalUsd: number;
  items: OrderItemDto[];
  statusHistory: OrderStatusHistoryDto[];
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderDto = OrderDto & {
  user: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  };
};
