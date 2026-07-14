import { clsx } from "clsx";
import type { ReactNode } from "react";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-tg-border bg-tg-surface p-4 shadow-panel", className)}>
      {children}
    </div>
  );
}
