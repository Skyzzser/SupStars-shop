import Link from "next/link";
import type { ProductDto } from "@suupstars/shared";
import { formatRub, formatUsd } from "@suupstars/shared";
import { ArrowRight, Gem, Crown } from "lucide-react";
import { Panel } from "./Panel";

export function ProductCard({ product }: { product: ProductDto }) {
  const href = product.type === "stars" ? "/stars" : "/premium";
  const Icon = product.type === "stars" ? Gem : Crown;

  return (
    <Link href={href} className="block">
      <Panel className="transition active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-tg-border bg-tg-button/15 text-tg-link">
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold">{product.title}</h2>
              <p className="mt-1 text-sm leading-5 text-tg-hint">{product.description}</p>
            </div>
          </div>
          <ArrowRight className="mt-1 shrink-0 text-tg-hint" size={18} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-tg-border bg-black/20 px-2.5 py-1 text-tg-text">
            {formatRub(product.priceRub)}
          </span>
          {product.priceUsd > 0 ? (
            <span className="rounded-md border border-tg-border bg-black/20 px-2.5 py-1 text-tg-text">
              {formatUsd(product.priceUsd)}
            </span>
          ) : null}
          <span className="ml-auto rounded-md bg-tg-button/15 px-2.5 py-1 font-medium text-tg-link">
            Выбрать
          </span>
        </div>
      </Panel>
    </Link>
  );
}
