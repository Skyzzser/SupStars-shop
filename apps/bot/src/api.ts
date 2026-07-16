import { randomUUID } from "node:crypto";
import { apiPublicUrl, env } from "./env.js";

type ProductType = "stars" | "premium";
type CryptoAsset = "USDT" | "TON";

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
  payments?: PaymentDto[];
  currentPayment?: PaymentDto | null;
  createdAt: string;
};

export type PaymentDto = {
  id: string;
  provider: string;
  status: string;
  asset: CryptoAsset | string | null;
  amount: number | null;
  payUrl: string | null;
  amountRub?: number;
  amountUsd?: number;
  manualWallet?: {
    network: string;
    asset: string;
    address: string;
    memo: string | null;
    txHash: string | null;
    instructions: string | null;
  } | null;
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

export async function createBotCryptoInvoice(
  input: { orderId: string; asset: CryptoAsset },
  user: { id: number; username?: string; first_name?: string },
) {
  return apiFetch<{ order: OrderDto; payment: PaymentDto }>("/payments/crypto/create", user, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createBotManualWalletPayment(
  input: { orderId: string },
  user: { id: number; username?: string; first_name?: string },
) {
  return apiFetch<{ order: OrderDto; payment: PaymentDto }>("/payments/manual-wallet/create", user, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function confirmBotManualWalletPayment(
  input: { paymentId: string; txHash?: string },
  user: { id: number; username?: string; first_name?: string },
) {
  return apiFetch<{ order: OrderDto; payment: PaymentDto }>("/payments/manual-wallet/confirm", user, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function adminVerifyBotManualWalletPayment(
  input: { paymentId: string; action: "approve" | "reject"; note?: string },
  user: { id: number; username?: string; first_name?: string },
) {
  return apiFetch<{ order: OrderDto; payment: PaymentDto }>("/admin/payments/manual/verify", user, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export async function listBotOrders(user: { id: number; username?: string; first_name?: string }) {
  return apiFetch<{ orders: OrderDto[] }>("/orders/me", user);
}
