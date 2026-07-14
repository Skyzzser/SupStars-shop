import { PREMIUM_PRICE_RUB, STARS_PRICE_RUB, STARS_PRICE_USD } from "./constants.js";

export function calculateStarsPrice(quantity: number) {
  return {
    totalUsd: roundMoney(quantity * STARS_PRICE_USD),
    totalRub: roundMoney(quantity * STARS_PRICE_RUB),
  };
}

export function calculatePremiumPrice() {
  return {
    totalUsd: 0,
    totalRub: PREMIUM_PRICE_RUB,
  };
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
