"use client";

import { useState } from "react";
import type { OrderStatus, PaymentDto } from "@suupstars/shared";
import { ORDER_STATUSES, formatRub, formatUsd } from "@suupstars/shared";
import { Lock, Save, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { StatusPill } from "@/components/StatusPill";
import {
  useAdminOrders,
  useAdminUpdateNote,
  useAdminUpdateStatus,
  useAdminVerifyManualWalletPayment,
  useCurrentUser,
} from "@/hooks/useOrders";

const MANUAL_PROVIDER = "manual_wallet_transfer";

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
        <Panel className="p-5">
          <h2 className="font-semibold">Нет доступа администратора</h2>
          <p className="mt-2 text-sm leading-5 text-tg-hint">
            Раздел доступен только администраторам из ADMIN_IDS или ADMIN_USERNAMES.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" action={<ShieldCheck className="text-tg-link" />}>
      <Panel className="p-5">
        <label className="block">
          <span className="mb-2 block text-sm text-tg-hint">Фильтр по статусу</span>
          <select
            value={status ?? ""}
            onChange={(event) => setStatus(event.target.value ? (event.target.value as OrderStatus) : undefined)}
            className="h-11 w-full rounded-lg border border-tg-border bg-black/25 px-3 outline-none"
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

      <div className="space-y-4">
        {orders.data?.orders.map((order) => {
          const manualPayment = order.payments.find((payment) => payment.provider === MANUAL_PROVIDER);

          return (
            <Panel key={order.id} className="p-5">
              <OrderSummary order={order} />
              <div className="mt-3 rounded-lg bg-black/25 p-3 text-sm text-tg-hint">
                <p>
                  Клиент: {order.user.username ? `@${order.user.username}` : order.user.telegramId}
                  {order.user.firstName ? ` · ${order.user.firstName}` : ""}
                </p>
                {order.comment ? <p className="mt-1">Комментарий: {order.comment}</p> : null}
              </div>

              {manualPayment ? <ManualPaymentControls payment={manualPayment} /> : null}

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
          );
        })}
      </div>
    </AppShell>
  );
}

function ManualPaymentControls({ payment }: { payment: PaymentDto }) {
  const [note, setNote] = useState("");
  const verify = useAdminVerifyManualWalletPayment();
  const details = payment.manualWallet;
  const canVerify = payment.status === "awaiting_manual_verification";

  if (!details) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-tg-border bg-black/25 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Ручной перевод</p>
          <p className="text-tg-hint">{details.network} · {details.asset} · {payment.status}</p>
        </div>
        <p className="text-right font-semibold">{formatRub(payment.amountRub)} / {formatUsd(payment.amountUsd)}</p>
      </div>
      <Info label="Адрес" value={details.address} />
      {details.memo ? <Info label="Memo" value={details.memo} /> : null}
      {details.txHash ? <Info label="Tx" value={details.txHash} /> : null}
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Заметка администратора"
        className="h-11 w-full rounded-lg border border-tg-border bg-black/25 px-3 text-sm outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={!canVerify || verify.isPending}
          onClick={() => verify.mutate({ paymentId: payment.id, action: "approve", note: note || undefined })}
          icon={<ShieldCheck size={16} />}
        >
          Подтвердить
        </Button>
        <Button
          variant="danger"
          disabled={!canVerify || verify.isPending}
          onClick={() => verify.mutate({ paymentId: payment.id, action: "reject", note: note || undefined })}
          icon={<XCircle size={16} />}
        >
          Отклонить
        </Button>
      </div>
      {verify.isError ? <ErrorState message={verify.error.message} /> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-tg-hint">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
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
          className="h-10 rounded-lg border border-tg-border bg-black/25 px-2 text-sm outline-none"
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
        placeholder="Заметка к смене статуса"
        className="h-11 w-full rounded-lg border border-tg-border bg-black/25 px-3 text-sm outline-none"
      />
      <Button className="w-full" onClick={() => onStatus(status, note || undefined)}>
        Обновить статус
      </Button>
      <textarea
        value={internalNote}
        onChange={(event) => setInternalNote(event.target.value)}
        rows={3}
        placeholder="Внутренняя заметка"
        className="w-full resize-none rounded-lg border border-tg-border bg-black/25 px-3 py-2 text-sm outline-none"
      />
      <Button variant="secondary" className="w-full" onClick={() => onNote(internalNote)} icon={<Save size={16} />}>
        Сохранить заметку
      </Button>
    </div>
  );
}
