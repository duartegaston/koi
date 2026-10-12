import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const buttonClass = {
  primary:
    "inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-xs font-medium uppercase tracking-[0.16em] text-paper transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50",
  secondary:
    "inline-flex h-12 items-center justify-center rounded-full border border-ink bg-transparent px-8 text-xs font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50",
  inverse:
    "inline-flex h-12 items-center justify-center rounded-full border border-paper bg-transparent px-8 text-xs font-medium uppercase tracking-[0.16em] text-paper transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper disabled:pointer-events-none disabled:opacity-50",
} as const;

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass[variant], className)} {...props} />;
}
