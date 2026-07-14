import { randomUUID } from "node:crypto";
import { env } from "./env.js";

type ProductType = "stars" | "premium";

export type BotOrderInput = {
  productType: ProductType;
  quantity: number;
  recipient: string;
  comment?: string;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  status: string;
  recipientUsername: string;
  totalRub: number;
  totalUsd: number;
  createdAt: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

function apiUrl(path: string) {
  return new URL(path, env.API_PUBLIC_URL).toString();
}

function botHeaders(user: { id: number; username?: string; first_name?: string }) {
  return {
    "content-type": "application/json",
    "x-bot-token": env.BOT_TOKEN,
    "x-dev-telegram-id": String(user.id),
    ...(user.username ? { "x-dev-username": user.username } : {}),
    ...(user.first_name ? { "x-dev-first-name": user.first_name } : {}),
  };
}

async function apiFetch<T>(path: string, user: { id: number; username?: string; first_name?: string }, init?: RequestInit) {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...botHeaders(user),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new Error(payload.error?.message ?? `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createBotOrder(input: BotOrderInput, user: { id: number; username?: string; first_name?: string }) {
  const body = {
    productType: input.productType,
    quantity: input.productType === "stars" ? input.quantity : 1,
    recipient: { username: input.recipient },
    comment: input.comment ?? "",
    idempotencyKey: randomUUID(),
  };

  return apiFetch<{ order: OrderDto }>("/orders", user, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listBotOrders(user: { id: number; username?: string; first_name?: string }) {
  return apiFetch<{ orders: OrderDto[] }>("/orders/me", user);
}
