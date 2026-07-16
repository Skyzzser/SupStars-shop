import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { CryptoAsset } from "@suupstars/shared";
import { env } from "../../config/env.js";
import { ApiError } from "../../lib/http.js";
import { productTypeLabel } from "../orders.service.js";
import {
  CRYPTO_BOT_PROVIDER,
  type CryptoWebhookUpdate,
  type CryptoPaymentProvider,
  type PaymentProviderInvoice,
  type PayableOrder,
} from "./types.js";

type CryptoPayResponse<T> =
  | {
      ok: true;
      result: T;
    }
  | {
      ok: false;
      error?: string;
      code?: string;
    };

type CryptoPayInvoice = {
  invoice_id: number;
  status: string;
  asset?: string;
  amount: string;
  bot_invoice_url?: string;
  mini_app_invoice_url?: string;
  web_app_invoice_url?: string;
  pay_url?: string;
};

type CryptoPayExchangeRate = {
  is_valid: boolean;
  source: string;
  target: string;
  rate: string;
};

type PriceBasis = {
  fiat: "USD" | "RUB";
  amount: number;
};

const REQUEST_TIMEOUT_MS = 10000;

export class CryptoBotPaymentProvider implements CryptoPaymentProvider {
  readonly name = CRYPTO_BOT_PROVIDER;

  async createInvoice(input: { order: PayableOrder; asset: CryptoAsset }): Promise<PaymentProviderInvoice> {
    const amount = await this.calculateAssetAmount(input.order, input.asset);
    const item = input.order.items[0];
    const productTitle = item ? productTypeLabel(item.productType) : "Telegram order";
    const orderUrl = new URL(`/orders/${input.order.id}`, env.PUBLIC_WEB_URL ?? env.WEB_APP_URL).toString();
    const invoicePayload = JSON.stringify({
      orderId: input.order.id,
      orderNumber: input.order.orderNumber,
      asset: input.asset,
    });

    const invoice = await this.request<CryptoPayInvoice>("createInvoice", {
      currency_type: "crypto",
      asset: input.asset,
      amount,
      description: `${productTitle} ${input.order.orderNumber}`,
      hidden_message: `Payment received for order ${input.order.orderNumber}`,
      paid_btn_name: "callback",
      paid_btn_url: orderUrl,
      payload: invoicePayload,
      allow_comments: false,
      allow_anonymous: false,
      expires_in: env.CRYPTOBOT_INVOICE_EXPIRES_IN,
    });

    const payUrl = invoice.bot_invoice_url ?? invoice.mini_app_invoice_url ?? invoice.web_app_invoice_url ?? invoice.pay_url;
    if (!payUrl) {
      throw new ApiError(502, "Crypto Pay did not return an invoice URL", "CRYPTOBOT_PAY_URL_MISSING");
    }

    return {
      provider: this.name,
      providerPaymentId: invoice.invoice_id.toString(),
      status: invoice.status,
      asset: input.asset,
      amount: invoice.amount,
      payUrl,
      payload: invoice as Record<string, unknown>,
    };
  }

  verifyWebhook(input: {
    rawBody: Buffer;
    signature: string | undefined;
    secret: string | undefined;
  }): CryptoWebhookUpdate {
    if (env.CRYPTOBOT_WEBHOOK_SECRET && input.secret !== env.CRYPTOBOT_WEBHOOK_SECRET) {
      throw new ApiError(401, "Invalid Crypto Pay webhook secret", "CRYPTOBOT_WEBHOOK_SECRET_INVALID");
    }

    const token = this.getToken();
    if (!input.signature) {
      throw new ApiError(401, "Missing Crypto Pay signature", "CRYPTOBOT_SIGNATURE_MISSING");
    }

    const signingKey = createHash("sha256").update(token).digest();
    const expected = createHmac("sha256", signingKey).update(input.rawBody).digest("hex");

    if (!safeEqualHex(expected, input.signature)) {
      throw new ApiError(401, "Invalid Crypto Pay signature", "CRYPTOBOT_SIGNATURE_INVALID");
    }

    const parsed = JSON.parse(input.rawBody.toString("utf8")) as CryptoWebhookUpdate;
    if (!parsed.update_type || !parsed.payload?.invoice_id) {
      throw new ApiError(400, "Invalid Crypto Pay webhook payload", "CRYPTOBOT_WEBHOOK_INVALID");
    }

    return parsed;
  }

  private async calculateAssetAmount(order: PayableOrder, asset: CryptoAsset) {
    const basis = getPriceBasis(order);
    const rates = await this.request<CryptoPayExchangeRate[]>("getExchangeRates");
    const rate = rates.find(
      (candidate) =>
        candidate.is_valid &&
        candidate.source.toUpperCase() === asset &&
        candidate.target.toUpperCase() === basis.fiat,
    );

    if (!rate) {
      throw new ApiError(502, `Crypto Pay exchange rate ${asset}/${basis.fiat} is unavailable`, "CRYPTOBOT_RATE_UNAVAILABLE");
    }

    const numericRate = Number(rate.rate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) {
      throw new ApiError(502, `Crypto Pay exchange rate ${asset}/${basis.fiat} is invalid`, "CRYPTOBOT_RATE_INVALID");
    }

    return formatCryptoAmount(basis.amount / numericRate);
  }

  private async request<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const init: RequestInit = {
        method: body ? "POST" : "GET",
        headers: {
          "content-type": "application/json",
          "Crypto-Pay-API-Token": this.getToken(),
        },
        signal: controller.signal,
      };

      if (body) {
        init.body = JSON.stringify(body);
      }

      const response = await fetch(new URL(`/api/${method}`, env.CRYPTOBOT_API_URL).toString(), init);

      const payload = (await response.json().catch(() => null)) as CryptoPayResponse<T> | null;
      if (!response.ok || !payload?.ok) {
        const detail = payload && "error" in payload ? payload.error : undefined;
        throw new ApiError(
          502,
          detail ? `Crypto Pay API error: ${detail}` : `Crypto Pay API failed with status ${response.status}`,
          "CRYPTOBOT_API_ERROR",
        );
      }

      return payload.result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(504, "Crypto Pay API did not respond in time", "CRYPTOBOT_TIMEOUT");
      }

      throw new ApiError(
        502,
        `Cannot reach Crypto Pay API: ${error instanceof Error ? error.message : String(error)}`,
        "CRYPTOBOT_NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getToken() {
    if (!env.CRYPTOBOT_API_TOKEN) {
      throw new ApiError(500, "CRYPTOBOT_API_TOKEN is not configured", "CRYPTOBOT_TOKEN_MISSING");
    }

    return env.CRYPTOBOT_API_TOKEN;
  }
}

function getPriceBasis(order: PayableOrder): PriceBasis {
  const totalUsd = order.totalUsd.toNumber();
  if (totalUsd > 0) {
    return { fiat: "USD", amount: totalUsd };
  }

  return { fiat: "RUB", amount: order.totalRub.toNumber() };
}

function formatCryptoAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ApiError(400, "Order amount must be greater than zero", "PAYMENT_AMOUNT_INVALID");
  }

  return value.toFixed(8).replace(/\.?0+$/, "");
}

function safeEqualHex(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
