import type { Order, OrderItem } from "@prisma/client";
import type { CryptoAsset } from "@suupstars/shared";

export const CRYPTO_BOT_PROVIDER = "crypto_bot";

export type PayableOrder = Order & {
  items: OrderItem[];
};

export type PaymentProviderInvoice = {
  provider: typeof CRYPTO_BOT_PROVIDER;
  providerPaymentId: string;
  status: string;
  asset: CryptoAsset;
  amount: string;
  payUrl: string;
  payload: Record<string, unknown>;
};

export type CryptoWebhookInvoice = {
  invoice_id: number;
  status: string;
  asset?: string;
  amount: string;
  bot_invoice_url?: string;
  mini_app_invoice_url?: string;
  web_app_invoice_url?: string;
  pay_url?: string;
  payload?: string;
  paid_at?: string;
  created_at?: string;
};

export type CryptoWebhookUpdate = {
  update_id: number;
  update_type: string;
  request_date: string;
  payload: CryptoWebhookInvoice;
};

export interface PaymentProvider {
  readonly name: typeof CRYPTO_BOT_PROVIDER;
  createInvoice(input: { order: PayableOrder; asset: CryptoAsset }): Promise<PaymentProviderInvoice>;
  verifyWebhook(input: {
    rawBody: Buffer;
    signature: string | undefined;
    secret: string | undefined;
  }): CryptoWebhookUpdate;
}
