import { z } from "zod";
import { CRYPTO_ASSETS, ORDER_STATUSES, PAYMENT_PROVIDERS, PAYMENT_STATUSES, PRODUCT_TYPES, STARS_MIN_QUANTITY } from "./constants.js";

export const productTypeSchema = z.enum(PRODUCT_TYPES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const cryptoAssetSchema = z.enum(CRYPTO_ASSETS);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);

export const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language_code: z.string().optional(),
});

export const recipientSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Укажите username или ID получателя")
    .max(64)
    .transform((value) => value.replace(/^@/, "")),
});

export const createOrderSchema = z.object({
  productType: productTypeSchema,
  quantity: z.number().int().positive().optional(),
  recipient: recipientSchema,
  comment: z.string().trim().max(500).optional().default(""),
  idempotencyKey: z.string().uuid(),
});

export const createStarsOrderSchema = createOrderSchema.extend({
  productType: z.literal("stars"),
  quantity: z.number().int().min(STARS_MIN_QUANTITY),
});

export const createPremiumOrderSchema = createOrderSchema.extend({
  productType: z.literal("premium"),
  quantity: z.literal(1).optional().default(1),
});

export const createOrderRequestSchema = z.discriminatedUnion("productType", [
  createStarsOrderSchema,
  createPremiumOrderSchema,
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(1000).optional(),
});

export const updateAdminNoteSchema = z.object({
  internalNote: z.string().trim().max(2000),
});

export const ordersQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  take: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

export const createCryptoInvoiceSchema = z.object({
  orderId: z.string().min(1),
  asset: cryptoAssetSchema,
});

export const createManualWalletPaymentSchema = z.object({
  orderId: z.string().min(1),
});

export const confirmManualWalletPaymentSchema = z.object({
  paymentId: z.string().min(1),
  txHash: z.string().trim().max(200).optional().default(""),
});

export const verifyManualWalletPaymentSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(1000).optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type CryptoAsset = z.infer<typeof cryptoAssetSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type CreateCryptoInvoiceRequest = z.infer<typeof createCryptoInvoiceSchema>;
export type CreateManualWalletPaymentRequest = z.infer<typeof createManualWalletPaymentSchema>;
export type ConfirmManualWalletPaymentRequest = z.infer<typeof confirmManualWalletPaymentSchema>;
export type VerifyManualWalletPaymentRequest = z.infer<typeof verifyManualWalletPaymentSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof updateOrderStatusSchema>;
