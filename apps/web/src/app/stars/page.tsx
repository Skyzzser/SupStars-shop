"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { calculateStarsPrice, formatRub, formatUsd, STARS_MIN_QUANTITY } from "@suupstars/shared";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { QuantitySelector } from "@/components/QuantitySelector";

export default function StarsPage() {
  const [quantity, setQuantity] = useState(50);
  const price = useMemo(() => calculateStarsPrice(quantity || 0), [quantity]);
  const isValid = quantity >= STARS_MIN_QUANTITY;

  return (
    <AppShell title="Telegram Stars">
      <Panel>
        <h2 className="font-semibold">Количество</h2>
        <p className="mt-1 text-sm text-tg-hint">Минимальный заказ: {STARS_MIN_QUANTITY} Stars.</p>
        <div className="mt-4">
          <QuantitySelector value={quantity} onChange={setQuantity} />
        </div>
        {!isValid ? (
          <p className="mt-3 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">
            Укажите не меньше {STARS_MIN_QUANTITY} Stars.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-black/20 p-3">
            <p className="text-sm text-tg-hint">Итого RUB</p>
            <p className="text-xl font-semibold">{formatRub(price.totalRub)}</p>
          </div>
          <div className="rounded-md bg-black/20 p-3">
            <p className="text-sm text-tg-hint">Итого USD</p>
            <p className="text-xl font-semibold">{formatUsd(price.totalUsd)}</p>
          </div>
        </div>
        <Link href={`/checkout?productType=stars&quantity=${quantity}`} className="mt-4 block">
          <Button disabled={!isValid} className="w-full" icon={<ShoppingCart size={18} />}>
            Перейти к оформлению
          </Button>
        </Link>
      </Panel>
    </AppShell>
  );
}
