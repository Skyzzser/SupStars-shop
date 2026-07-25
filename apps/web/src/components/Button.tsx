import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
};

export function Button({ className, variant = "primary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-[#34b7f1] to-[#69d6ff] text-tg-buttonText shadow-[0_14px_30px_rgba(52,183,241,0.24)]",
        variant === "secondary" && "border border-tg-border bg-white/[0.07] text-tg-text backdrop-blur",
        variant === "danger" && "bg-red-500/90 text-white shadow-[0_12px_26px_rgba(239,68,68,0.2)]",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
