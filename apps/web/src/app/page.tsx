"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useProducts } from "@/hooks/useOrders";

export default function HomePage() {
  const products = useProducts();
  const productList = products.data?.products ?? [];

  return (
    <AppShell
      title="Магазин"
      action={
        <Link href="/admin">
          <Button variant="secondary" icon={<ShieldCheck size={16} />} aria-label="Админка">
            Admin
          </Button>
        </Link>
      }
    >
      <section className="rounded-lg border border-tg-border bg-tg-surface p-4">
        <h2 className="text-lg font-semibold">Telegram Stars и Premium</h2>
        <p className="mt-2 text-sm leading-5 text-tg-hint">
          Оформляйте заказ в Mini App, отслеживайте статусы и получайте уведомления от бота.
        </p>
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
