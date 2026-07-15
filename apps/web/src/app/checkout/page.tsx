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
      // The mutation state renders a user-facing error below the form.
    }
  }

  return (
    <AppShell title="Оформление">
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-tg-hint">Товар</p>
            <h2 className="text-lg font-semibold">{productTitle}</h2>
          </div>
          <span className="rounded-md bg-black/20 px-3 py-1.5 text-sm">
            {productType === "stars" ? `${quantity} шт.` : "1 шт."}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-black/20 p-3">
            <p className="text-sm text-tg-hint">RUB</p>
            <p className="font-semibold">{formatRub(price.totalRub)}</p>
          </div>
          <div className="rounded-md bg-black/20 p-3">
            <p className="text-sm text-tg-hint">USD</p>
            <p className="font-semibold">{formatUsd(price.totalUsd)}</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <label className="block">
          <span className="mb-2 block text-sm text-tg-hint">Получатель</span>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="@username или Telegram ID"
            className="h-12 w-full rounded-md border border-tg-border bg-black/20 px-3 text-base outline-none focus:border-tg-button"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-tg-hint">Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder="Например: удобное время, уточнения по получателю"
            className="w-full resize-none rounded-md border border-tg-border bg-black/20 px-3 py-3 text-base outline-none focus:border-tg-button"
          />
        </label>
      </Panel>

      {createOrder.isError ? <ErrorState message={createOrder.error.message} /> : null}
      {!canAuthenticate ? (
        <ErrorState message="Откройте магазин через кнопку Mini App в Telegram. В обычном браузере Telegram initData недоступен, поэтому заказ создать нельзя." />
      ) : null}

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
