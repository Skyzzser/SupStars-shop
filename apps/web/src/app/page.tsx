"use client";

import Link from "next/link";
import { HelpCircle, ShieldCheck, ShoppingBag } from "lucide-react";
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
      title="Магазин"
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
      <section className="rounded-lg border border-tg-border bg-tg-surface p-4 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-tg-button/15 text-tg-link">
            <ShoppingBag size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Telegram Stars и Premium</h2>
            <p className="mt-2 text-sm leading-5 text-tg-hint">
              Выберите товар, оплатите через Crypto Bot и отслеживайте статус заказа здесь.
            </p>
          </div>
        </div>
        <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-tg-link">
          <HelpCircle size={16} />
          Помощь и вопросы
        </Link>
      </section>

      {products.isLoading ? <LoadingState text="Загружаем товары..." /> : null}
      {products.isError ? <ErrorState message={products.error.message} /> : null}
      {products.isSuccess && productList.length === 0 ? (
        <EmptyState
          title="Товары не найдены"
          text="В базе нет активных товаров. Запустите seed для production database."
        />
      ) : null}

      <div className="space-y-3">
        {productList.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </AppShell>
  );
}
