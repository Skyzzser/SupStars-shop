export const STARS_MIN_QUANTITY = 50;
export const RUB_PER_USD = 79;
export const STARS_PRICE_RUB = 1.4;
export const STARS_PRICE_USD = 0.0177;
export const PREMIUM_PRICE_RUB = 400;
export const PREMIUM_PRICE_USD = 5.06;

export const SERVICE_FEE_CONFIG = {
  enabled: false,
  percent: 0,
  fixedRub: 0,
} as const;

export const STARS_PRESETS = [50, 100, 250, 500, 1000] as const;

export const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "awaiting_manual_verification",
  "paid",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
] as const;

export const PRODUCT_TYPES = ["stars", "premium"] as const;

export const CRYPTO_ASSETS = ["USDT", "TON"] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "active",
  "awaiting_manual_verification",
  "paid",
  "expired",
  "failed",
  "rejected",
] as const;

export const PAYMENT_PROVIDERS = ["crypto_bot", "manual_wallet_transfer"] as const;
