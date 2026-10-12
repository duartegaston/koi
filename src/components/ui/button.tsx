import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";

export const buttonClass = {
  primary: `inline-flex min-h-14 items-center justify-center rounded-full bg-primary px-8 font-label text-xl font-bold leading-none text-primary-foreground transition-opacity hover:opacity-90 ${focus}`,
  secondary: `inline-flex min-h-12 items-center justify-center rounded-full border border-foreground bg-transparent px-7 font-label text-base font-medium text-foreground transition-colors hover:bg-surface ${focus}`,
  inverse: `inline-flex min-h-12 items-center justify-center rounded-full border border-paper bg-transparent px-7 font-label text-base font-medium text-paper transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper disabled:pointer-events-none disabled:opacity-50`,
} as const;

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClass[variant], className)} {...props} />;
}
