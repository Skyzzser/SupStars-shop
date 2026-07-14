import type { AdminOrderDto, OrderDto, ProductDto } from "@suupstars/shared";
import type { CreateOrderRequest, OrderStatus, UpdateOrderStatusRequest } from "@suupstars/shared";
import { getTelegramInitData } from "./telegram";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DEV_TELEGRAM_ID = process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID;
const DEV_USERNAME = process.env.NEXT_PUBLIC_DEV_USERNAME ?? "dev_user";

type ApiErrorPayload = {
  error?: {
    code: string;
    message: string;
  };
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");

  const initData = getTelegramInitData();
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  } else if (DEV_TELEGRAM_ID) {
    headers.set("x-dev-telegram-id", DEV_TELEGRAM_ID);
    headers.set("x-dev-username", DEV_USERNAME);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new Error(payload.error?.message ?? "Ошибка запроса");
  }

  return response.json() as Promise<T>;
}

export const api = {
  products: () => apiFetch<{ products: ProductDto[] }>("/products"),
  createOrder: (input: CreateOrderRequest) =>
    apiFetch<{ order: OrderDto }>("/orders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  myOrders: () => apiFetch<{ orders: OrderDto[] }>("/orders/me"),
  order: (id: string) => apiFetch<{ order: OrderDto }>(`/orders/${id}`),
  cancelOrder: (id: string) =>
    apiFetch<{ order: OrderDto }>(`/orders/${id}/cancel`, { method: "POST" }),
  adminOrders: (status?: OrderStatus) => {
    const suffix = status ? `?status=${status}` : "";
    return apiFetch<{ orders: AdminOrderDto[] }>(`/admin/orders${suffix}`);
  },
  adminUpdateStatus: (id: string, input: UpdateOrderStatusRequest) =>
    apiFetch<{ order: AdminOrderDto }>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  adminUpdateNote: (id: string, internalNote: string) =>
    apiFetch<{ order: AdminOrderDto }>(`/admin/orders/${id}/note`, {
      method: "PATCH",
      body: JSON.stringify({ internalNote }),
    }),
};
