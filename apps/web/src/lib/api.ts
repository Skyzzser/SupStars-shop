import type { AdminOrderDto, OrderDto, ProductDto } from "@suupstars/shared";
import type { CreateOrderRequest, OrderStatus, UpdateOrderStatusRequest } from "@suupstars/shared";
import { getTelegramInitData } from "./telegram";

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
const DEV_TELEGRAM_ID = process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID;
const DEV_USERNAME = process.env.NEXT_PUBLIC_DEV_USERNAME ?? "dev_user";
const REQUEST_TIMEOUT_MS = 10000;

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

function normalizeApiUrl(value: string | undefined) {
  if (!value) {
    return process.env.NODE_ENV === "production" ? "" : "http://localhost:4000";
  }

  return value.replace(/\/+$/, "");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

function getApiUrl(path: string) {
  if (!API_URL) {
    throw new Error(
      "API URL is not configured. Set NEXT_PUBLIC_API_URL to your public API HTTPS URL and redeploy the Mini App.",
    );
  }

  const url = new URL(path, `${API_URL}/`);

  if (typeof window !== "undefined") {
    const apiHostname = url.hostname;
    const appHostname = window.location.hostname;

    if (isLocalHostname(apiHostname) && !isLocalHostname(appHostname)) {
      throw new Error(
        "Mini App is configured to use localhost API. Set NEXT_PUBLIC_API_URL to the public API URL and redeploy.",
      );
    }
  }

  return url.toString();
}

function mapNetworkError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error("API did not respond in time. Check that the public API is deployed and reachable.");
  }

  if (error instanceof TypeError) {
    return new Error("Cannot reach API. Check NEXT_PUBLIC_API_URL, API deploy status, HTTPS and CORS settings.");
  }

  return error;
}

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

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getApiUrl(path), {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      if (payload.error?.code === "AUTH_REQUIRED") {
        throw new Error("Откройте Mini App через Telegram, чтобы оформить заказ.");
      }
      throw new Error(payload.error?.message ?? `API request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    throw mapNetworkError(error);
  } finally {
    globalThis.clearTimeout(timeout);
  }
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
