"use client";

import Link from "next/link";
import { ShoppingCart, Sparkles } from "lucide-react";
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
      <Panel className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tg-button/15 text-tg-link">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Сколько Stars нужно?</h2>
            <p className="mt-1 text-sm leading-5 text-tg-hint">Минимальный заказ: {STARS_MIN_QUANTITY} Stars.</p>
          </div>
        </div>
        <div className="mt-5">
          <QuantitySelector value={quantity} onChange={setQuantity} />
        </div>
        {!isValid ? (
          <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
            Введите минимум {STARS_MIN_QUANTITY} Stars.
          </p>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
          <PriceRow label="Стоимость" value={`${formatRub(price.subtotalRub)} / ${formatUsd(price.subtotalUsd)}`} />
          {price.serviceFeeApplied ? (
            <PriceRow label="Сервисный сбор" value={`${formatRub(price.serviceFeeRub)} / ${formatUsd(price.serviceFeeUsd)}`} />
          ) : null}
          <PriceRow label="Итого" value={`${formatRub(price.totalRub)} / ${formatUsd(price.totalUsd)}`} strong />
        </div>
        <Link href={`/checkout?productType=stars&quantity=${quantity}`} className="mt-4 block">
          <Button disabled={!isValid} className="w-full" icon={<ShoppingCart size={18} />}>
            Перейти к заказу
          </Button>
        </Link>
      </Panel>
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
