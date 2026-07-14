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
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-tg-hint">RUB</p>
          <p className="font-semibold">{formatRub(order.totalRub)}</p>
        </div>
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-tg-hint">USD</p>
          <p className="font-semibold">{formatUsd(order.totalUsd)}</p>
        </div>
      </div>
    </div>
  );
}
