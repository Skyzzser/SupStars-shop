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
      title="Store"
      action={
        isAdmin ? (
          <Link href="/admin">
            <Button variant="secondary" icon={<ShieldCheck size={16} />} aria-label="Admin">
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
            <h2 className="text-lg font-semibold">Telegram Stars and Premium</h2>
            <p className="mt-2 text-sm leading-5 text-tg-hint">
              Choose a product, pay with Crypto Bot or wallet transfer, and track order status here.
            </p>
          </div>
        </div>
        <Link href="/support" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-tg-link">
          <HelpCircle size={16} />
          Help and questions
        </Link>
      </section>

      {products.isLoading ? <LoadingState text="Loading products..." /> : null}
      {products.isError ? <ErrorState message={products.error.message} /> : null}
      {products.isSuccess && productList.length === 0 ? (
        <EmptyState
          title="No products found"
          text="There are no active products in the database. Run seed for the production database."
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
