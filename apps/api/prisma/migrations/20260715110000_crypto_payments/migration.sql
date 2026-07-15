ALTER TABLE "Payment"
ADD COLUMN "asset" TEXT,
ADD COLUMN "amount" DECIMAL(18, 8),
ADD COLUMN "payUrl" TEXT,
ADD COLUMN "rawWebhookPayload" JSONB,
ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
