"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, CreditCard, ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CryptoAsset, PaymentDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { OrderSummary } from "@/components/OrderSummary";
import { Panel } from "@/components/Panel";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { statusLabel } from "@/components/StatusPill";
import { useCreateCryptoInvoice, useOrder } from "@/hooks/useOrders";

const PAYMENT_METHODS: CryptoAsset[] = ["USDT", "TON"];

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
  const [selectedPayment, setSelectedPayment] = useState<PaymentDto | null>(null);
  const order = useOrder(orderId, polling ? 5000 : false);
  const createInvoice = useCreateCryptoInvoice();

  const currentOrder = order.data?.order;
  const latestCryptoPayment = useMemo(() => {
    if (!currentOrder) {
      return null;
    }

    return currentOrder.payments.find((payment) => payment.provider === "crypto_bot") ?? null;
  }, [currentOrder]);

  const visiblePayment = selectedPayment ?? latestCryptoPayment;
  const isPaid = currentOrder ? ["paid", "processing", "completed"].includes(currentOrder.status) : false;

  useEffect(() => {
    if (isPaid) {
      setPolling(false);
    }
  }, [isPaid]);

  async function onCreateInvoice(asset: CryptoAsset) {
    if (!orderId) {
      return;
    }

    const result = await createInvoice.mutateAsync({ orderId, asset });
    setSelectedPayment(result.payment);
    await order.refetch();
  }

  return (
    <AppShell title="Оплата">
      {!orderId ? <ErrorState message="Заказ не найден. Вернитесь в магазин и создайте заказ заново." /> : null}
      {order.isLoading ? <LoadingState /> : null}
      {order.isError ? <ErrorState message={order.error.message} /> : null}

      {currentOrder ? (
        <>
          <Panel>
            <OrderSummary order={currentOrder} />
            <div className="mt-4 grid gap-2 text-sm">
              <InfoRow label="Получатель" value={`@${currentOrder.recipientUsername}`} />
              <InfoRow label="Количество" value={`${currentOrder.items[0]?.quantity ?? 1}`} />
              <InfoRow label="Статус" value={statusLabel(currentOrder.status)} />
              {currentOrder.comment ? <InfoRow label="Комментарий" value={currentOrder.comment} /> : null}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Способ оплаты</h2>
                <p className="text-sm text-tg-hint">Crypto Bot / Crypto Pay API</p>
              </div>
              <WalletCards className="text-tg-hint" size={22} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((asset) => (
                <Button
                  key={asset}
                  disabled={isPaid || createInvoice.isPending}
                  onClick={() => onCreateInvoice(asset)}
                  icon={<CreditCard size={17} />}
                >
                  {createInvoice.isPending ? "Создаём..." : `Оплатить ${asset}`}
                </Button>
              ))}
            </div>

            <div className="mt-4 rounded-md bg-black/20 p-3 text-sm">
              <p className="text-tg-hint">Цена заказа</p>
              <p className="font-semibold">
                {formatRub(currentOrder.totalRub)}
                {currentOrder.totalUsd > 0 ? ` / ${formatUsd(currentOrder.totalUsd)}` : ""}
              </p>
            </div>
          </Panel>

          {createInvoice.isError ? <ErrorState message={createInvoice.error.message} /> : null}

          {visiblePayment ? (
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{visiblePayment.asset} invoice</h2>
                  <p className="text-sm text-tg-hint">
                    {visiblePayment.amount ? `${visiblePayment.amount} ${visiblePayment.asset}` : "Сумма готовится"}
                  </p>
                </div>
                <span className="rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
                  {visiblePayment.status === "paid" || isPaid ? "Оплачено" : "Ожидание оплаты"}
                </span>
              </div>

              {visiblePayment.payUrl ? (
                <a
                  href={visiblePayment.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-tg-button px-4 text-sm font-semibold text-tg-buttonText transition"
                >
                  Открыть счет <ExternalLink size={17} />
                </a>
              ) : null}
            </Panel>
          ) : null}

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
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-tg-hint">
              <RefreshCw size={15} />
              Статус обновляется автоматически
            </div>
          )}

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
    <div className="flex items-start justify-between gap-3 rounded-md bg-black/20 px-3 py-2">
      <span className="text-tg-hint">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
