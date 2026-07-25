"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackageCheck, ShieldCheck, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/stars", label: "Stars", icon: ShoppingBag },
  { href: "/premium", label: "Premium", icon: PackageCheck },
  { href: "/orders", label: "Заказы", icon: ShieldCheck },
];

export function AppShell({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 pt-5 text-tg-text">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-tg-link">@SuupStarbot</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
        </div>
        {action}
      </header>

      <section className="flex-1 space-y-5 safe-bottom">{children}</section>

      <nav className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-4 border-t border-tg-border bg-[rgba(8,10,16,0.88)] px-2 py-2 backdrop-blur-xl">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-tg-hint transition",
                active && "bg-white/[0.09] text-tg-text shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
