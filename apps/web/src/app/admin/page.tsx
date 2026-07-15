"use client";

import { useState } from "react";
import type { OrderStatus } from "@suupstars/shared";
import { ORDER_STATUSES } from "@suupstars/shared";
import { Lock, Save, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { StatusPill } from "@/components/StatusPill";
import { useAdminOrders, useAdminUpdateNote, useAdminUpdateStatus, useCurrentUser } from "@/hooks/useOrders";

export default function AdminPage() {
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.data?.user.isAdmin === true;
  const orders = useAdminOrders(status, isAdmin);
  const updateStatus = useAdminUpdateStatus();
  const updateNote = useAdminUpdateNote();

  if (currentUser.isLoading) {
    return (
      <AppShell title="Admin">
        <LoadingState text="Проверяем доступ..." />
      </AppShell>
    );
  }

  if (currentUser.isError || !isAdmin) {
    return (
      <AppShell title="Доступ закрыт" action={<Lock className="text-tg-hint" />}>
        <Panel>
          <h2 className="font-semibold">Нет доступа к Admin</h2>
          <p className="mt-2 text-sm leading-5 text-tg-hint">
            Этот раздел доступен только администраторам из ADMIN_IDS.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" action={<ShieldCheck className="text-tg-link" />}>
      <Panel>
        <label className="block">
          <span className="mb-2 block text-sm text-tg-hint">Фильтр статуса</span>
          <select
            value={status ?? ""}
            onChange={(event) => setStatus(event.target.value ? (event.target.value as OrderStatus) : undefined)}
            className="h-11 w-full rounded-md border border-tg-border bg-black/20 px-3 outline-none"
          >
            <option value="">Все</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </Panel>

      {orders.isLoading ? <LoadingState /> : null}
      {orders.isError ? <ErrorState message={orders.error.message} /> : null}
      {updateStatus.isError ? <ErrorState message={updateStatus.error.message} /> : null}
      {updateNote.isError ? <ErrorState message={updateNote.error.message} /> : null}

      <div className="space-y-3">
        {orders.data?.orders.map((order) => (
          <Panel key={order.id}>
            <OrderSummary order={order} />
            <div className="mt-3 rounded-md bg-black/20 p-3 text-sm text-tg-hint">
              <p>
                Клиент: {order.user.username ? `@${order.user.username}` : order.user.telegramId}
                {order.user.firstName ? ` · ${order.user.firstName}` : ""}
              </p>
              {order.comment ? <p className="mt-1">Комментарий: {order.comment}</p> : null}
            </div>
            <AdminOrderControls
              orderId={order.id}
              currentStatus={order.status}
              currentNote={order.internalNote ?? ""}
              onStatus={(nextStatus, note) =>
                updateStatus.mutate({ id: order.id, input: { status: nextStatus, note } })
              }
              onNote={(internalNote) => updateNote.mutate({ id: order.id, internalNote })}
            />
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}

function AdminOrderControls({
  orderId,
  currentStatus,
  currentNote,
  onStatus,
  onNote,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  currentNote: string;
  onStatus: (status: OrderStatus, note?: string) => void;
  onNote: (internalNote: string) => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState(currentNote);

  return (
    <div className="mt-4 space-y-3" data-order-id={orderId}>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={currentStatus} />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className="h-10 rounded-md border border-tg-border bg-black/20 px-2 text-sm outline-none"
        >
          {ORDER_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Комментарий к смене статуса"
        className="h-11 w-full rounded-md border border-tg-border bg-black/20 px-3 text-sm outline-none"
      />
      <Button className="w-full" onClick={() => onStatus(status, note || undefined)}>
        Обновить статус
      </Button>
      <textarea
        value={internalNote}
        onChange={(event) => setInternalNote(event.target.value)}
        rows={3}
        placeholder="Внутренняя заметка"
        className="w-full resize-none rounded-md border border-tg-border bg-black/20 px-3 py-2 text-sm outline-none"
      />
      <Button variant="secondary" className="w-full" onClick={() => onNote(internalNote)} icon={<Save size={16} />}>
        Сохранить заметку
      </Button>
    </div>
  );
}
