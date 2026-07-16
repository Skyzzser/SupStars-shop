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
        <h2 className="font-semibold">Quantity</h2>
        <p className="mt-1 text-sm text-tg-hint">Minimum order: {STARS_MIN_QUANTITY} Stars.</p>
        <div className="mt-4">
          <QuantitySelector value={quantity} onChange={setQuantity} />
        </div>
        {!isValid ? (
          <p className="mt-3 rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">
            Enter at least {STARS_MIN_QUANTITY} Stars.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <div className="space-y-2 rounded-md border border-tg-border bg-black/20 p-3 text-sm">
          <PriceRow label="Base price" value={`${formatRub(price.subtotalRub)} / ${formatUsd(price.subtotalUsd)}`} />
          {price.serviceFeeApplied ? (
            <PriceRow label="Service fee" value={`${formatRub(price.serviceFeeRub)} / ${formatUsd(price.serviceFeeUsd)}`} />
          ) : null}
          <PriceRow label="Total" value={`${formatRub(price.totalRub)} / ${formatUsd(price.totalUsd)}`} strong />
        </div>
        <Link href={`/checkout?productType=stars&quantity=${quantity}`} className="mt-4 block">
          <Button disabled={!isValid} className="w-full" icon={<ShoppingCart size={18} />}>
            Checkout
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
