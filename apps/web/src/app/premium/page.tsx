"use client";

import Link from "next/link";
import { Crown, ShoppingCart } from "lucide-react";
import { calculatePremiumPrice, formatRub, formatUsd } from "@suupstars/shared";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";

export default function PremiumPage() {
  const price = calculatePremiumPrice();

  return (
    <AppShell title="Telegram Premium">
      <Panel>
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-tg-button/15 text-tg-link">
            <Crown size={24} />
          </div>
          <div>
            <h2 className="font-semibold">Premium for recipient account</h2>
            <p className="mt-1 text-sm leading-5 text-tg-hint">
              Fixed price with manual payment and fulfillment confirmation by admin.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md bg-black/20 p-3">
          <p className="text-sm text-tg-hint">Price</p>
          <p className="text-2xl font-semibold">{formatRub(price.totalRub)}</p>
          <p className="text-sm text-tg-hint">{formatUsd(price.totalUsd)}</p>
        </div>
      </Panel>
      <Link href="/checkout?productType=premium" className="block">
        <Button className="w-full" icon={<ShoppingCart size={18} />}>
          Checkout
        </Button>
      </Link>
    </AppShell>
  );
}
