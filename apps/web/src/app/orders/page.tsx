"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useMyOrders } from "@/hooks/useOrders";

export default function OrdersPage() {
  const orders = useMyOrders();

  return (
    <AppShell title="Мои заказы">
      {orders.isLoading ? <LoadingState /> : null}
      {orders.isError ? <ErrorState message={orders.error.message} /> : null}
      {orders.data?.orders.length === 0 ? (
        <EmptyState title="Заказов пока нет" text="Созданные заказы появятся здесь вместе с текущим статусом." />
      ) : null}
      <div className="space-y-3">
        {orders.data?.orders.map((order) => (
          <Link href={`/orders/${order.id}`} key={order.id} className="block">
            <Panel>
              <OrderSummary order={order} />
            </Panel>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
