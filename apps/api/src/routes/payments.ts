import { Router } from "express";
import { confirmManualWalletPaymentSchema, createCryptoInvoiceSchema, createManualWalletPaymentSchema } from "@suupstars/shared";
import { ApiError } from "../lib/http.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireTelegramUser } from "../middleware/auth.js";
import { orderToDto } from "../services/mapper.js";
import {
  confirmCryptoWebhook,
  confirmManualWalletPayment,
  createCryptoInvoice,
  createManualWalletPayment,
  paymentToPublicDto,
} from "../services/payments/payments.service.js";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/crypto/create",
  requireTelegramUser,
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = createCryptoInvoiceSchema.parse(req.body);
    const result = await createCryptoInvoice({ ...input, user: req.authUser });

    res.status(201).json({
      order: orderToDto(result.order),
      payment: paymentToPublicDto(result.payment),
    });
  }),
);

paymentsRouter.post(
  "/manual-wallet/create",
  requireTelegramUser,
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = createManualWalletPaymentSchema.parse(req.body);
    const result = await createManualWalletPayment({ ...input, user: req.authUser });

    res.status(201).json({
      order: orderToDto(result.order),
      payment: paymentToPublicDto(result.payment),
    });
  }),
);

paymentsRouter.post(
  "/manual-wallet/confirm",
  requireTelegramUser,
  asyncHandler(async (req, res) => {
    if (!req.authUser) {
      throw new ApiError(401, "Auth required", "AUTH_REQUIRED");
    }

    const input = confirmManualWalletPaymentSchema.parse(req.body);
    const result = await confirmManualWalletPayment({ ...input, user: req.authUser });

    res.json({
      order: orderToDto(result.order),
      payment: paymentToPublicDto(result.payment),
    });
  }),
);

paymentsRouter.post(
  "/crypto/webhook",
  asyncHandler(async (req, res) => {
    if (!req.rawBody) {
      throw new ApiError(400, "Raw body is required", "RAW_BODY_REQUIRED");
    }

    const secret = getSecret(req.query.secret, req.header("x-cryptobot-webhook-secret"));
    const signature = req.header("crypto-pay-api-signature") ?? undefined;
    const result = await confirmCryptoWebhook({ rawBody: req.rawBody, signature, secret });

    res.json(result);
  }),
);

function getSecret(querySecret: unknown, headerSecret: string | undefined) {
  if (typeof querySecret === "string") {
    return querySecret;
  }

  return headerSecret;
}
