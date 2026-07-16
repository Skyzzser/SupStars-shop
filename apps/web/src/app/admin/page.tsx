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
        <LoadingState text="Checking access..." />
      </AppShell>
    );
  }

  if (currentUser.isError || !isAdmin) {
    return (
      <AppShell title="Access denied" action={<Lock className="text-tg-hint" />}>
        <Panel>
          <h2 className="font-semibold">No admin access</h2>
          <p className="mt-2 text-sm leading-5 text-tg-hint">
            This section is available only for admins configured in ADMIN_IDS or ADMIN_USERNAMES.
          </p>
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" action={<ShieldCheck className="text-tg-link" />}>
      <Panel>
        <label className="block">
          <span className="mb-2 block text-sm text-tg-hint">Status filter</span>
          <select
            value={status ?? ""}
            onChange={(event) => setStatus(event.target.value ? (event.target.value as OrderStatus) : undefined)}
            className="h-11 w-full rounded-md border border-tg-border bg-black/20 px-3 outline-none"
          >
            <option value="">All</option>
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
        {orders.data?.orders.map((order) => {
          const manualPayment = order.payments.find((payment) => payment.provider === MANUAL_PROVIDER);

          return (
            <Panel key={order.id}>
              <OrderSummary order={order} />
              <div className="mt-3 rounded-md bg-black/20 p-3 text-sm text-tg-hint">
                <p>
                  Client: {order.user.username ? `@${order.user.username}` : order.user.telegramId}
                  {order.user.firstName ? ` · ${order.user.firstName}` : ""}
                </p>
                {order.comment ? <p className="mt-1">Comment: {order.comment}</p> : null}
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
    <div className="mt-4 space-y-3 rounded-md border border-tg-border bg-black/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Manual wallet payment</p>
          <p className="text-tg-hint">{details.network} · {details.asset} · {payment.status}</p>
        </div>
        <p className="text-right font-semibold">{formatRub(payment.amountRub)} / {formatUsd(payment.amountUsd)}</p>
      </div>
      <Info label="Address" value={details.address} />
      {details.memo ? <Info label="Memo" value={details.memo} /> : null}
      {details.txHash ? <Info label="Tx" value={details.txHash} /> : null}
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Admin note"
        className="h-11 w-full rounded-md border border-tg-border bg-black/20 px-3 text-sm outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={!canVerify || verify.isPending}
          onClick={() => verify.mutate({ paymentId: payment.id, action: "approve", note: note || undefined })}
          icon={<ShieldCheck size={16} />}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          disabled={!canVerify || verify.isPending}
          onClick={() => verify.mutate({ paymentId: payment.id, action: "reject", note: note || undefined })}
          icon={<XCircle size={16} />}
        >
          Reject
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
        placeholder="Status change note"
        className="h-11 w-full rounded-md border border-tg-border bg-black/20 px-3 text-sm outline-none"
      />
      <Button className="w-full" onClick={() => onStatus(status, note || undefined)}>
        Update status
      </Button>
      <textarea
        value={internalNote}
        onChange={(event) => setInternalNote(event.target.value)}
        rows={3}
        placeholder="Internal note"
        className="w-full resize-none rounded-md border border-tg-border bg-black/20 px-3 py-2 text-sm outline-none"
      />
      <Button variant="secondary" className="w-full" onClick={() => onNote(internalNote)} icon={<Save size={16} />}>
        Save note
      </Button>
    </div>
  );
}
