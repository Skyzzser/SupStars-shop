"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import {
  calculatePremiumPrice,
  calculateStarsPrice,
  formatRub,
  formatUsd,
  STARS_MIN_QUANTITY,
} from "@suupstars/shared";
import type { CreateOrderRequest, ProductType } from "@suupstars/shared";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { useCreateOrder } from "@/hooks/useOrders";
import { makeIdempotencyKey } from "@/lib/idempotency";
import { isTelegramEnvironment } from "@/lib/telegram";

const HAS_DEV_AUTH = Boolean(process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID);

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Оформление">
          <LoadingState />
        </AppShell>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();
  const productType = normalizeProductType(params.get("productType"));
  const quantity = normalizeQuantity(params.get("quantity"), productType);
  const [recipient, setRecipient] = useState("");
  const [comment, setComment] = useState("");
  const [idempotencyKey] = useState(makeIdempotencyKey);
  const [canAuthenticate, setCanAuthenticate] = useState(HAS_DEV_AUTH);
  const createOrder = useCreateOrder();

  useEffect(() => {
    setCanAuthenticate(HAS_DEV_AUTH || isTelegramEnvironment());
  }, []);

  const price = useMemo(() => {
    return productType === "stars" ? calculateStarsPrice(quantity) : calculatePremiumPrice();
  }, [productType, quantity]);

  const productTitle = productType === "stars" ? "Telegram Stars" : "Telegram Premium";
  const canSubmit = canAuthenticate && recipient.trim().length > 0 && !createOrder.isPending;

  async function onSubmit() {
    const base = {
      recipient: { username: recipient },
      comment,
      idempotencyKey,
    };

    const input: CreateOrderRequest =
      productType === "stars"
        ? { ...base, productType: "stars", quantity }
        : { ...base, productType: "premium", quantity: 1 };

    try {
      const result = await createOrder.mutateAsync(input);
      router.replace(`/checkout/payment?orderId=${result.order.id}`);
    } catch {
      // Mutation state renders the error.
    }
  }

  return (
    <AppShell title="Оформление">
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-tg-hint">Товар</p>
            <h2 className="text-lg font-semibold">{productTitle}</h2>
          </div>
          <span className="rounded-lg bg-black/25 px-3 py-1.5 text-sm">
            {productType === "stars" ? `${quantity} шт.` : "1 шт."}
          </span>
        </div>
        <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
          <PriceRow label="Стоимость" value={`${formatRub(price.subtotalRub)} / ${formatUsd(price.subtotalUsd)}`} />
          {price.serviceFeeApplied ? (
            <PriceRow label="Сервисный сбор" value={`${formatRub(price.serviceFeeRub)} / ${formatUsd(price.serviceFeeUsd)}`} />
          ) : null}
          <PriceRow label="Итого" value={`${formatRub(price.totalRub)} / ${formatUsd(price.totalUsd)}`} strong />
        </div>
      </Panel>

      <Panel className="p-5">
        <label className="block">
          <span className="mb-2 block text-sm text-tg-hint">Получатель</span>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="@username или Telegram ID"
            className="h-12 w-full rounded-lg border border-tg-border bg-black/25 px-3 text-base outline-none focus:border-tg-button"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-tg-hint">Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="Необязательные детали для выдачи"
            className="w-full resize-none rounded-lg border border-tg-border bg-black/25 px-3 py-3 text-base outline-none focus:border-tg-button"
          />
        </label>
      </Panel>

      {createOrder.isError ? <ErrorState message={createOrder.error.message} /> : null}
      {!canAuthenticate ? <ErrorState message="Откройте магазин через Telegram Mini App, чтобы создать заказ." /> : null}

      <div className="grid grid-cols-2 gap-2">
        <Link href={productType === "stars" ? "/stars" : "/premium"}>
          <Button variant="secondary" className="w-full" icon={<ArrowLeft size={17} />}>
            Назад
          </Button>
        </Link>
        <Button onClick={() => router.push("/")} variant="danger" icon={<XCircle size={17} />}>
          Отмена
        </Button>
      </div>
      <Button disabled={!canSubmit} onClick={onSubmit} className="w-full" icon={<CheckCircle size={18} />}>
        {createOrder.isPending ? "Создаем заказ..." : "Подтвердить заказ"}
      </Button>
    </AppShell>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-tg-hint">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function normalizeProductType(value: string | null): ProductType {
  return value === "premium" ? "premium" : "stars";
}

function normalizeQuantity(value: string | null, productType: ProductType) {
  if (productType === "premium") {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= STARS_MIN_QUANTITY ? Math.floor(parsed) : STARS_MIN_QUANTITY;
}
