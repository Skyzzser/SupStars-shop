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
      <Panel className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ffd166]/20 via-transparent to-[#ff8fab]/12" />
        <div className="relative flex gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.09] text-[#ffd166]">
            <Crown size={26} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Premium для аккаунта получателя</h2>
            <p className="mt-2 text-sm leading-6 text-tg-hint">
              Фиксированная цена, ручная выдача после подтверждения оплаты администратором.
            </p>
          </div>
        </div>
        <div className="relative mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
          <p className="text-sm text-tg-hint">Цена</p>
          <p className="mt-1 text-3xl font-semibold">{formatRub(price.totalRub)}</p>
          <p className="text-sm text-tg-hint">{formatUsd(price.totalUsd)}</p>
        </div>
      </Panel>
      <Link href="/checkout?productType=premium" className="block">
        <Button className="w-full" icon={<ShoppingCart size={18} />}>
          Оформить Premium
        </Button>
      </Link>
    </AppShell>
  );
}
