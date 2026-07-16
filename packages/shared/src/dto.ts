import type { CryptoAsset, OrderStatus, PaymentStatus, ProductType } from "./schemas.js";
import type { PricingBreakdown } from "./pricing.js";

export type ProductDto = {
  id: string;
  type: ProductType;
  title: string;
  description: string;
  minQuantity: number | null;
  priceRub: number;
  priceUsd: number;
  isActive: boolean;
};

export type CurrentUserDto = {
  telegramId: string;
  username: string | null;
  firstName: string | null;
  isAdmin: boolean;
};

export type OrderItemDto = {
  id: string;
  productType: ProductType;
  title: string;
  quantity: number;
  totalRub: number;
  totalUsd: number;
};

export type OrderStatusHistoryDto = {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  actorTelegramId: string | null;
};

export type ManualWalletPaymentDetailsDto = {
  network: string;
  asset: string;
  address: string;
  memo: string | null;
  txHash: string | null;
  instructions: string | null;
};

export type PaymentDto = {
  id: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus | string;
  asset: CryptoAsset | string | null;
  amount: number | null;
  payUrl: string | null;
  amountRub: number;
  amountUsd: number;
  manualWallet: ManualWalletPaymentDetailsDto | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  recipientUsername: string;
  comment: string | null;
  internalNote?: string | null;
  totalRub: number;
  totalUsd: number;
  pricing: PricingBreakdown;
  items: OrderItemDto[];
  payments: PaymentDto[];
  currentPayment: PaymentDto | null;
  statusHistory: OrderStatusHistoryDto[];
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderDto = OrderDto & {
  user: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  };
};
