import type { Prisma } from "@prisma/client";
import { manualWalletConfig } from "../../config/env.js";
import { ApiError } from "../../lib/http.js";
import { MANUAL_WALLET_PROVIDER, type ManualPaymentProvider, type ManualWalletPaymentSession, type PayableOrder } from "./types.js";

export class ManualWalletTransferProvider implements ManualPaymentProvider {
  readonly name = MANUAL_WALLET_PROVIDER;

  createPaymentSession(input: { order: PayableOrder }): ManualWalletPaymentSession {
    if (!manualWalletConfig.enabled) {
      throw new ApiError(400, "Перевод на кошелек отключен", "MANUAL_WALLET_DISABLED");
    }

    if (!manualWalletConfig.address) {
      throw new ApiError(500, "Адрес кошелька не настроен", "MANUAL_WALLET_ADDRESS_MISSING");
    }

    const amount = input.order.totalUsd.toNumber() > 0 ? input.order.totalUsd.toString() : input.order.totalRub.toString();

    return {
      provider: this.name,
      providerPaymentId: `manual:${input.order.orderNumber}`,
      status: "pending",
      asset: manualWalletConfig.asset,
      amount,
      payload: {
        network: manualWalletConfig.network,
        asset: manualWalletConfig.asset,
        address: manualWalletConfig.address,
        ...(manualWalletConfig.memo ? { memo: manualWalletConfig.memo } : {}),
        ...(manualWalletConfig.instructions ? { instructions: manualWalletConfig.instructions } : {}),
      },
    };
  }
}

export function mergeManualWalletPayload(payload: Prisma.JsonValue | null, patch: Record<string, unknown>) {
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  return { ...(base as Record<string, unknown>), ...patch } as Prisma.InputJsonValue;
}
