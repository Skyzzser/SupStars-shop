"use client";

import { CheckCircle, CreditCard, ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { CryptoAsset, OrderDto, PaymentDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { useCreateCryptoInvoice } from "@/hooks/useOrders";
import { Button } from "./Button";
import { Panel } from "./Panel";
import { ErrorState } from "./StateViews";

const PAYMENT_METHODS: CryptoAsset[] = ["USDT", "TON"];

export function PaymentSection({
  order,
  onPaymentCreated,
}: {
  order: OrderDto;
  onPaymentCreated?: () => Promise<unknown> | unknown;
}) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);
  const createInvoice = useCreateCryptoInvoice();
  const isPaid = ["paid", "processing", "completed"].includes(order.status);
  const canPay = !isPaid && !["cancelled", "refunded", "failed"].includes(order.status);

  const visiblePayment = useMemo(() => {
    return selectedPayment ?? order.currentPayment ?? order.payments[0] ?? null;
  }, [order.currentPayment, order.payments, selectedPayment]);

  async function onCreateInvoice(asset: CryptoAsset) {
    const result = await createInvoice.mutateAsync({ orderId: order.id, asset });
    setSelectedPayment(result.payment);
    await onPaymentCreated?.();
  }

  return (
    <>
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Оплата</h2>
            <p className="text-sm text-tg-hint">Crypto Bot / Crypto Pay API</p>
          </div>
          <WalletCards className="text-tg-hint" size={22} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((asset) => (
            <Button
              key={asset}
              disabled={!canPay || createInvoice.isPending}
              onClick={() => onCreateInvoice(asset)}
              icon={<CreditCard size={17} />}
            >
              {createInvoice.isPending ? "Создаём..." : `Оплатить ${asset}`}
            </Button>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-tg-border bg-black/20 p-3 text-sm">
          <p className="text-tg-hint">Сумма заказа</p>
          <p className="font-semibold">
            {formatRub(order.totalRub)}
            {order.totalUsd > 0 ? ` / ${formatUsd(order.totalUsd)}` : ""}
          </p>
        </div>
      </Panel>

      {createInvoice.isError ? <ErrorState message={createInvoice.error.message} /> : null}

      {visiblePayment ? <InvoiceCard payment={visiblePayment} isPaid={isPaid} /> : null}

      {isPaid ? (
        <Panel>
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 text-emerald-300" size={22} />
            <div>
              <h2 className="font-semibold">Оплата получена</h2>
              <p className="text-sm text-tg-hint">
                Заказ оплачен. Мы получили подтверждение от Crypto Bot и передали заказ в обработку.
              </p>
            </div>
          </div>
        </Panel>
      ) : canPay ? (
        <div className="flex items-center justify-center gap-2 text-sm text-tg-hint">
          <RefreshCw size={15} />
          Статус оплаты обновляется автоматически
        </div>
      ) : null}
    </>
  );
}

function InvoiceCard({ payment, isPaid }: { payment: PaymentDto; isPaid: boolean }) {
  const paid = payment.status === "paid" || isPaid;

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{payment.asset ?? "Crypto"} invoice</h2>
          <p className="text-sm text-tg-hint">
            {payment.amount && payment.asset ? `${payment.amount} ${payment.asset}` : "Сумма готовится"}
          </p>
        </div>
        <span className="rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
          {paid ? "Оплачено" : payment.status === "expired" ? "Истёк" : "Ожидание оплаты"}
        </span>
      </div>

      {payment.payUrl && !paid ? (
        <a
          href={payment.payUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-tg-button px-4 text-sm font-semibold text-tg-buttonText transition"
        >
          Открыть счёт <ExternalLink size={17} />
        </a>
      ) : null}
    </Panel>
  );
}
