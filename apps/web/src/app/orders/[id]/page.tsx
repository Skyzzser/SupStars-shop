"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { statusLabel } from "@/components/StatusPill";
import { useCancelOrder, useOrder } from "@/hooks/useOrders";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const order = useOrder(params.id);
  const cancelOrder = useCancelOrder();
  const canCancel =
    order.data?.order.status === "pending" || order.data?.order.status === "awaiting_payment";

  async function onCancel() {
    await cancelOrder.mutateAsync(params.id);
    await order.refetch();
  }

  return (
    <AppShell title="Статус заказа">
      {order.isLoading ? <LoadingState /> : null}
      {order.isError ? <ErrorState message={order.error.message} /> : null}
      {order.data ? (
        <>
          <Panel>
            <OrderSummary order={order.data.order} />
            {order.data.order.comment ? (
              <p className="mt-3 rounded-md bg-black/20 p-3 text-sm text-tg-hint">
                {order.data.order.comment}
              </p>
            ) : null}
          </Panel>

          <Panel>
            <h2 className="font-semibold">История статусов</h2>
            <div className="mt-3 space-y-3">
              {order.data.order.statusHistory.map((entry) => (
                <div key={entry.id} className="border-l-2 border-tg-border pl-3">
                  <p className="text-sm font-semibold">{statusLabel(entry.status)}</p>
                  <p className="text-xs text-tg-hint">{new Date(entry.createdAt).toLocaleString("ru-RU")}</p>
                  {entry.note ? <p className="mt-1 text-sm text-tg-hint">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          </Panel>

          {cancelOrder.isError ? <ErrorState message={cancelOrder.error.message} /> : null}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => router.push("/orders")} icon={<ArrowLeft size={17} />}>
              Назад
            </Button>
            <Button
              variant="danger"
              disabled={!canCancel || cancelOrder.isPending}
              onClick={onCancel}
              icon={<Ban size={17} />}
            >
              Отменить
            </Button>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
