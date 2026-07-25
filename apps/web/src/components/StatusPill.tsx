import type { OrderStatus } from "@suupstars/shared";
import { clsx } from "clsx";

const labels: Record<OrderStatus, string> = {
  pending: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  awaiting_manual_verification: "Проверка админа",
  paid: "Оплачен",
  processing: "В работе",
  completed: "Готово",
  failed: "Ошибка",
  cancelled: "Отменен",
  refunded: "Возврат",
};

const tone: Record<OrderStatus, string> = {
  pending: "bg-slate-500/20 text-slate-200",
  awaiting_payment: "bg-amber-500/20 text-amber-200",
  awaiting_manual_verification: "bg-orange-500/20 text-orange-200",
  paid: "bg-blue-500/20 text-blue-200",
  processing: "bg-cyan-500/20 text-cyan-200",
  completed: "bg-emerald-500/20 text-emerald-200",
  failed: "bg-red-500/20 text-red-200",
  cancelled: "bg-zinc-500/20 text-zinc-200",
  refunded: "bg-violet-500/20 text-violet-200",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tone[status])}>
      {labels[status]}
    </span>
  );
}

export function statusLabel(status: OrderStatus) {
  return labels[status];
}
