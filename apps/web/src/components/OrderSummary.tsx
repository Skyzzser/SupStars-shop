import type { OrderDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { StatusPill } from "./StatusPill";

export function OrderSummary({ order }: { order: OrderDto }) {
  const item = order.items[0];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{order.orderNumber}</h2>
          <p className="text-sm text-tg-hint">
            {item?.title ?? "Заказ"} · @{order.recipientUsername}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="space-y-2 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
        <Row label="Стоимость" value={`${formatRub(order.pricing.subtotalRub)} / ${formatUsd(order.pricing.subtotalUsd)}`} />
        {order.pricing.serviceFeeApplied ? (
          <Row label="Сервисный сбор" value={`${formatRub(order.pricing.serviceFeeRub)} / ${formatUsd(order.pricing.serviceFeeUsd)}`} />
        ) : null}
        <Row label="Итого" value={`${formatRub(order.totalRub)} / ${formatUsd(order.totalUsd)}`} strong />
      </div>
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
