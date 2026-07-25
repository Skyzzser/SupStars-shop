"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { PaymentSection } from "@/components/PaymentSection";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { statusLabel } from "@/components/StatusPill";
import { useOrder } from "@/hooks/useOrders";

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Оплата">
          <LoadingState />
        </AppShell>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "";
  const [polling, setPolling] = useState(true);
  const order = useOrder(orderId, polling ? 5000 : false);

  const currentOrder = order.data?.order;
  const isPaid = currentOrder ? ["paid", "processing", "completed"].includes(currentOrder.status) : false;

  useEffect(() => {
    if (isPaid) {
      setPolling(false);
    }
  }, [isPaid]);

  return (
    <AppShell title="Оплата">
      {!orderId ? <ErrorState message="Заказ не найден. Вернитесь в магазин и создайте заказ заново." /> : null}
      {order.isLoading ? <LoadingState /> : null}
      {order.isError ? <ErrorState message={order.error.message} /> : null}

      {currentOrder ? (
        <>
          <Panel className="p-5">
            <OrderSummary order={currentOrder} />
            <div className="mt-4 grid gap-2 text-sm">
              <InfoRow label="Получатель" value={`@${currentOrder.recipientUsername}`} />
              <InfoRow label="Количество" value={`${currentOrder.items[0]?.quantity ?? 1}`} />
              <InfoRow label="Статус" value={statusLabel(currentOrder.status)} />
              {currentOrder.comment ? <InfoRow label="Комментарий" value={currentOrder.comment} /> : null}
            </div>
          </Panel>

          <PaymentSection order={currentOrder} onPaymentCreated={() => order.refetch()} />

          <Link href={`/orders/${currentOrder.id}`}>
            <Button variant="secondary" className="w-full">
              Открыть статус заказа
            </Button>
          </Link>
        </>
      ) : null}
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-black/25 px-3 py-2">
      <span className="text-tg-hint">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
