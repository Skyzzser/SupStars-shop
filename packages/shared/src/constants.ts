export const STARS_MIN_QUANTITY = 50;
export const STARS_PRICE_USD = 0.019;
export const STARS_PRICE_RUB = 1.5;
export const PREMIUM_PRICE_RUB = 400;

export const STARS_PRESETS = [50, 100, 250, 500, 1000] as const;

export const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
] as const;

export const PRODUCT_TYPES = ["stars", "premium"] as const;
