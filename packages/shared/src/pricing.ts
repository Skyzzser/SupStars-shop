import {
  PREMIUM_PRICE_RUB,
  PREMIUM_PRICE_USD,
  RUB_PER_USD,
  SERVICE_FEE_CONFIG,
  STARS_PRICE_RUB,
  STARS_PRICE_USD,
} from "./constants.js";

export type ServiceFeeConfig = {
  enabled: boolean;
  percent: number;
  fixedRub: number;
};

export type PricingBreakdown = {
  subtotalRub: number;
  subtotalUsd: number;
  serviceFeeRub: number;
  serviceFeeUsd: number;
  totalRub: number;
  totalUsd: number;
  serviceFeeApplied: boolean;
};

export function calculateStarsPrice(quantity: number, feeConfig: ServiceFeeConfig = SERVICE_FEE_CONFIG): PricingBreakdown {
  return withServiceFee({
    subtotalRub: roundMoney(quantity * STARS_PRICE_RUB),
    subtotalUsd: roundMoney(quantity * STARS_PRICE_USD),
    feeConfig,
  });
}

export function calculatePremiumPrice(feeConfig: ServiceFeeConfig = SERVICE_FEE_CONFIG): PricingBreakdown {
  return withServiceFee({
    subtotalRub: PREMIUM_PRICE_RUB,
    subtotalUsd: PREMIUM_PRICE_USD,
    feeConfig,
  });
}

export function makePricingBreakdown(input: {
  subtotalRub: number;
  subtotalUsd: number;
  totalRub: number;
  totalUsd: number;
}): PricingBreakdown {
  const serviceFeeRub = roundMoney(Math.max(0, input.totalRub - input.subtotalRub));
  const serviceFeeUsd = roundMoney(Math.max(0, input.totalUsd - input.subtotalUsd));

  return {
    subtotalRub: roundMoney(input.subtotalRub),
    subtotalUsd: roundMoney(input.subtotalUsd),
    serviceFeeRub,
    serviceFeeUsd,
    totalRub: roundMoney(input.totalRub),
    totalUsd: roundMoney(input.totalUsd),
    serviceFeeApplied: serviceFeeRub > 0 || serviceFeeUsd > 0,
  };
}

function withServiceFee(input: {
  subtotalRub: number;
  subtotalUsd: number;
  feeConfig: ServiceFeeConfig;
}): PricingBreakdown {
  const serviceFeeRub = calculateServiceFeeRub(input.subtotalRub, input.feeConfig);
  const serviceFeeUsd = roundMoney(serviceFeeRub / RUB_PER_USD);

  return {
    subtotalRub: input.subtotalRub,
    subtotalUsd: input.subtotalUsd,
    serviceFeeRub,
    serviceFeeUsd,
    totalRub: roundMoney(input.subtotalRub + serviceFeeRub),
    totalUsd: roundMoney(input.subtotalUsd + serviceFeeUsd),
    serviceFeeApplied: serviceFeeRub > 0,
  };
}

function calculateServiceFeeRub(subtotalRub: number, feeConfig: ServiceFeeConfig) {
  if (!feeConfig.enabled) {
    return 0;
  }

  const percentFee = subtotalRub * (feeConfig.percent / 100);
  return roundMoney(percentFee + feeConfig.fixedRub);
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
