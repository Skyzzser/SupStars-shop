"use client";

import { CheckCircle, Copy, CreditCard, ExternalLink, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { CryptoAsset, OrderDto, PaymentDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { useConfirmManualWalletPayment, useCreateCryptoInvoice, useCreateManualWalletPayment } from "@/hooks/useOrders";
import { Button } from "./Button";
import { Panel } from "./Panel";
import { ErrorState } from "./StateViews";

const CRYPTO_ASSETS: CryptoAsset[] = ["USDT", "TON"];
const MANUAL_PROVIDER = "manual_wallet_transfer";

type PaymentMethod = "crypto" | "wallet";

export function PaymentSection({
  order,
  onPaymentCreated,
}: {
  order: OrderDto;
  onPaymentCreated?: () => Promise<unknown> | unknown;
}) {
  const [method, setMethod] = useState<PaymentMethod>(order.currentPayment?.provider === MANUAL_PROVIDER ? "wallet" : "crypto");
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);
  const createInvoice = useCreateCryptoInvoice();
  const createManualWallet = useCreateManualWalletPayment();
  const isPaid = ["paid", "processing", "completed"].includes(order.status);
  const canPay = !isPaid && !["cancelled", "refunded", "failed"].includes(order.status);

  const visiblePayment = useMemo(() => {
    const provider = method === "wallet" ? MANUAL_PROVIDER : "crypto_bot";
    return (
      selectedPayment?.provider === provider
        ? selectedPayment
        : order.payments.find((payment) => payment.provider === provider) ??
          (order.currentPayment?.provider === provider ? order.currentPayment : null)
    );
  }, [method, order.currentPayment, order.payments, selectedPayment]);

  async function onCreateInvoice(asset: CryptoAsset) {
    const result = await createInvoice.mutateAsync({ orderId: order.id, asset });
    setSelectedPayment(result.payment);
    await onPaymentCreated?.();
  }

  async function onCreateManualWallet() {
    const result = await createManualWallet.mutateAsync({ orderId: order.id });
    setSelectedPayment(result.payment);
    await onPaymentCreated?.();
  }

  const error = createInvoice.error?.message ?? createManualWallet.error?.message;

  return (
    <>
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Оплата</h2>
            <p className="mt-1 text-sm text-tg-hint">Выберите счет Crypto Bot или перевод на кошелек.</p>
          </div>
          <WalletCards className="text-tg-hint" size={22} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant={method === "crypto" ? "primary" : "secondary"} onClick={() => setMethod("crypto")} icon={<CreditCard size={17} />}>
            Crypto Bot
          </Button>
          <Button variant={method === "wallet" ? "primary" : "secondary"} onClick={() => setMethod("wallet")} icon={<WalletCards size={17} />}>
            Кошелек
          </Button>
        </div>

        <PriceBreakdown order={order} />
      </Panel>

      {method === "crypto" ? (
        <Panel className="p-5">
          <div className="grid grid-cols-2 gap-2">
            {CRYPTO_ASSETS.map((asset) => (
              <Button
                key={asset}
                disabled={!canPay || createInvoice.isPending}
                onClick={() => onCreateInvoice(asset)}
                icon={<CreditCard size={17} />}
              >
                {createInvoice.isPending ? "Создаем..." : `Оплатить ${asset}`}
              </Button>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel className="p-5">
          <Button
            disabled={!canPay || createManualWallet.isPending}
            onClick={onCreateManualWallet}
            className="w-full"
            icon={<WalletCards size={17} />}
          >
            {createManualWallet.isPending ? "Готовим..." : visiblePayment ? "Обновить реквизиты" : "Показать реквизиты"}
          </Button>
        </Panel>
      )}

      {error ? <ErrorState message={error} /> : null}

      {visiblePayment && method === "crypto" ? <InvoiceCard payment={visiblePayment} isPaid={isPaid} /> : null}
      {visiblePayment && method === "wallet" ? (
        <ManualWalletCard payment={visiblePayment} isPaid={isPaid} onUpdated={onPaymentCreated} />
      ) : null}

      {isPaid ? (
        <Panel className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 text-emerald-300" size={22} />
            <div>
              <h2 className="font-semibold">Оплата получена</h2>
              <p className="text-sm text-tg-hint">Заказ оплачен и готовится к ручной выдаче.</p>
            </div>
          </div>
        </Panel>
      ) : canPay ? (
        <div className="flex items-center justify-center gap-2 text-sm text-tg-hint">
          <RefreshCw size={15} />
          Crypto Bot обновляется webhook-ом, перевод проверяет администратор.
        </div>
      ) : null}
    </>
  );
}

function PriceBreakdown({ order }: { order: OrderDto }) {
  return (
    <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
      <Row label="Стоимость" value={`${formatRub(order.pricing.subtotalRub)} / ${formatUsd(order.pricing.subtotalUsd)}`} />
      {order.pricing.serviceFeeApplied ? (
        <Row label="Сервисный сбор" value={`${formatRub(order.pricing.serviceFeeRub)} / ${formatUsd(order.pricing.serviceFeeUsd)}`} />
      ) : null}
      <Row label="Итого" value={`${formatRub(order.totalRub)} / ${formatUsd(order.totalUsd)}`} strong />
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-tg-hint">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function InvoiceCard({ payment, isPaid }: { payment: PaymentDto; isPaid: boolean }) {
  const paid = payment.status === "paid" || isPaid;

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Счет {payment.asset ?? "Crypto"}</h2>
          <p className="text-sm text-tg-hint">
            {payment.amount && payment.asset ? `${payment.amount} ${payment.asset}` : "Сумма готовится"}
          </p>
        </div>
        <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
          {paid ? "Оплачен" : payment.status === "expired" ? "Истек" : "Ожидает"}
        </span>
      </div>

      {payment.payUrl && !paid ? (
        <a
          href={payment.payUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#34b7f1] to-[#69d6ff] px-5 text-sm font-semibold text-white transition"
        >
          Открыть счет <ExternalLink size={17} />
        </a>
      ) : null}
    </Panel>
  );
}

function ManualWalletCard({
  payment,
  isPaid,
  onUpdated,
}: {
  payment: PaymentDto;
  isPaid: boolean;
  onUpdated?: (() => Promise<unknown> | unknown) | undefined;
}) {
  const [txHash, setTxHash] = useState(payment.manualWallet?.txHash ?? "");
  const confirmManual = useConfirmManualWalletPayment();
  const details = payment.manualWallet;
  const waiting = payment.status === "awaiting_manual_verification";
  const paid = payment.status === "paid" || isPaid;

  async function onConfirm() {
    await confirmManual.mutateAsync({ paymentId: payment.id, txHash });
    await onUpdated?.();
  }

  if (!details) {
    return <ErrorState message="Реквизиты недоступны. Проверьте MANUAL_WALLET_* env в API." />;
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Перевод на кошелек</h2>
          <p className="text-sm text-tg-hint">{details.network} · {details.asset}</p>
        </div>
        <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
          {paid ? "Оплачен" : waiting ? "Проверка" : payment.status === "rejected" ? "Отклонен" : "Ждем перевод"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <Row label="Сумма" value={`${payment.amount ?? payment.amountUsd} ${payment.asset ?? details.asset}`} strong />
        <CopyRow label="Адрес" value={details.address} />
        {details.memo ? <CopyRow label="Memo" value={details.memo} /> : null}
        {details.instructions ? <p className="rounded-lg bg-black/25 p-3 text-tg-hint">{details.instructions}</p> : null}
      </div>

      {!paid && !waiting ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-2 block text-sm text-tg-hint">Tx hash / transaction id</span>
            <input
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              placeholder="Необязательно, но ускорит проверку"
              className="h-12 w-full rounded-lg border border-tg-border bg-black/25 px-3 text-base outline-none focus:border-tg-button"
            />
          </label>
          <Button disabled={confirmManual.isPending} onClick={onConfirm} className="w-full" icon={<ShieldCheck size={17} />}>
            {confirmManual.isPending ? "Отправляем..." : "Я оплатил"}
          </Button>
          {confirmManual.isError ? <ErrorState message={confirmManual.error.message} /> : null}
        </div>
      ) : null}

      {waiting ? <p className="mt-4 text-sm text-tg-hint">Ждем проверку администратора. После подтверждения заказ станет оплаченным.</p> : null}
    </Panel>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  async function copy() {
    await navigator.clipboard?.writeText(value);
  }

  return (
    <div className="rounded-lg bg-black/25 p-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-tg-hint">
        <span>{label}</span>
        <button type="button" onClick={copy} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-tg-border">
          <Copy size={14} />
        </button>
      </div>
      <p className="break-all font-semibold">{value}</p>
    </div>
  );
}
