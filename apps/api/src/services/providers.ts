import type { Order, OrderItem } from "@prisma/client";

export type ProviderOrder = Order & { items: OrderItem[] };

export type PaymentIntent = {
  provider: string;
  status: "manual_required";
  instructions: string;
};

export interface PaymentProvider {
  createPaymentIntent(order: ProviderOrder): Promise<PaymentIntent>;
}

export interface StarsDeliveryProvider {
  deliverStars(order: ProviderOrder): Promise<{ provider: string; manualRequired: boolean }>;
}

export interface PremiumDeliveryProvider {
  deliverPremium(order: ProviderOrder): Promise<{ provider: string; manualRequired: boolean }>;
}

export class ManualPaymentProvider implements PaymentProvider {
  async createPaymentIntent(order: ProviderOrder): Promise<PaymentIntent> {
    void order;

    return {
      provider: "manual",
      status: "manual_required",
      instructions: "Оплата подтверждается администратором вручную.",
    };
  }
}

export class ManualStarsDeliveryProvider implements StarsDeliveryProvider {
  async deliverStars(order: ProviderOrder) {
    void order;

    return { provider: "manual-stars", manualRequired: true };
  }
}

export class ManualPremiumDeliveryProvider implements PremiumDeliveryProvider {
  async deliverPremium(order: ProviderOrder) {
    void order;

    return { provider: "manual-premium", manualRequired: true };
  }
}
