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
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-tg-button/15 text-tg-link">
              <Icon size={22} />
            </div>
            <div>
              <h2 className="font-semibold">{product.title}</h2>
              <p className="mt-1 text-sm leading-5 text-tg-hint">{product.description}</p>
            </div>
          </div>
          <ArrowRight className="mt-1 text-tg-hint" size={18} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-md bg-black/20 px-2.5 py-1 text-tg-text">{formatRub(product.priceRub)}</span>
          {product.priceUsd > 0 ? (
            <span className="rounded-md bg-black/20 px-2.5 py-1 text-tg-text">
              {formatUsd(product.priceUsd)}
            </span>
          ) : null}
        </div>
      </Panel>
    </Link>
  );
}
