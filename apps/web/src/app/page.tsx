"use client";

import Link from "next/link";
import { HelpCircle, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useCurrentUser, useProducts } from "@/hooks/useOrders";

export default function HomePage() {
  const products = useProducts();
  const currentUser = useCurrentUser();
  const productList = products.data?.products ?? [];
  const isAdmin = currentUser.data?.user.isAdmin === true;

  return (
    <AppShell
      title="Suup Stars"
      action={
        isAdmin ? (
          <Link href="/admin">
            <Button variant="secondary" icon={<ShieldCheck size={16} />} aria-label="Админка">
              Admin
            </Button>
          </Link>
        ) : null
      }
    >
      <section className="glass-panel relative overflow-hidden rounded-lg p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#34b7f1]/24 via-transparent to-[#ff8fab]/12" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.09] text-tg-link shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <ShoppingBag size={25} />
          </div>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-normal text-tg-link">
              <Sparkles size={12} />
              Telegram Mini App
            </div>
            <h2 className="text-xl font-semibold">Stars и Premium без лишних шагов</h2>
            <p className="mt-2 text-sm leading-6 text-tg-hint">
              Выберите товар, оплатите через Crypto Bot или переводом на кошелек и отслеживайте заказ прямо здесь.
            </p>
          </div>
        </div>
        <Link href="/support" className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-tg-link">
          <HelpCircle size={16} />
          FAQ и поддержка
        </Link>
      </section>

      {products.isLoading ? <LoadingState text="Загружаем товары..." /> : null}
      {products.isError ? <ErrorState message={products.error.message} /> : null}
      {products.isSuccess && productList.length === 0 ? (
        <EmptyState
          title="Товары пока не найдены"
          text="В базе нет активных товаров. Запустите seed для production database."
        />
      ) : null}

      <div className="space-y-4">
        {productList.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </AppShell>
  );
}
