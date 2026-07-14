import { randomUUID } from "node:crypto";
import { apiPublicUrl, env } from "./env.js";

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
    code?: string;
    message?: string;
  };
};

export class BotApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 10000;

function apiUrl(path: string) {
  return new URL(path, `${apiPublicUrl}/`).toString();
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

async function apiFetch<T>(
  path: string,
  user: { id: number; username?: string; first_name?: string },
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = apiUrl(path);

  try {
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(botHeaders(user))) {
      headers.set(key, value);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      throw new BotApiError(
        payload.error?.message ?? `API request failed: ${response.status}`,
        response.status,
        payload.error?.code,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof BotApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new BotApiError(`API timeout after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
    }

    throw new BotApiError(`Cannot reach API at ${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
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
