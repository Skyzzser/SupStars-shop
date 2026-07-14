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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-tg-button text-tg-buttonText",
        variant === "secondary" && "border border-tg-border bg-tg-surface text-tg-text",
        variant === "danger" && "bg-red-500 text-white",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
