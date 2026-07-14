"use client";

import Link from "next/link";
import { Crown, ShoppingCart } from "lucide-react";
import { formatRub, PREMIUM_PRICE_RUB } from "@suupstars/shared";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";

export default function PremiumPage() {
  return (
    <AppShell title="Telegram Premium">
      <Panel>
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-tg-button/15 text-tg-link">
            <Crown size={24} />
          </div>
          <div>
            <h2 className="font-semibold">Premium на аккаунт получателя</h2>
            <p className="mt-1 text-sm leading-5 text-tg-hint">
              Фиксированная цена, ручное подтверждение оплаты и выполнения администратором.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md bg-black/20 p-3">
          <p className="text-sm text-tg-hint">Стоимость</p>
          <p className="text-2xl font-semibold">{formatRub(PREMIUM_PRICE_RUB)}</p>
        </div>
      </Panel>
      <Link href="/checkout?productType=premium" className="block">
        <Button className="w-full" icon={<ShoppingCart size={18} />}>
          Перейти к оформлению
        </Button>
      </Link>
    </AppShell>
  );
}
