import Link from "next/link";
import type { ProductDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { ArrowRight, Crown, Gem, Sparkles } from "lucide-react";
import { Panel } from "./Panel";

export function ProductCard({ product }: { product: ProductDto }) {
  const href = product.type === "stars" ? "/stars" : "/premium";
  const Icon = product.type === "stars" ? Gem : Crown;
  const accent =
    product.type === "stars"
      ? "from-[#34b7f1]/25 via-[#6bd7ff]/10 to-transparent"
      : "from-[#ffd166]/22 via-[#ff8fab]/10 to-transparent";

  return (
    <Link href={href} className="block">
      <Panel className="relative overflow-hidden p-5 transition hover:border-white/20 active:scale-[0.99]">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.08] text-tg-link shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-normal text-tg-link">
                <Sparkles size={12} />
                Быстрая заявка
              </div>
              <h2 className="text-lg font-semibold">{product.title}</h2>
              <p className="mt-1 text-sm leading-5 text-tg-hint">{product.description}</p>
            </div>
          </div>
          <ArrowRight className="mt-2 shrink-0 text-tg-hint" size={19} />
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-tg-text">
            {formatRub(product.priceRub)}
          </span>
          {product.priceUsd > 0 ? (
            <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-tg-text">
              {formatUsd(product.priceUsd)}
            </span>
          ) : null}
          <span className="ml-auto rounded-lg bg-tg-button/20 px-3 py-1.5 font-semibold text-tg-link">Выбрать</span>
        </div>
      </Panel>
    </Link>
  );
}
