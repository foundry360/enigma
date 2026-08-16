import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-60",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
};

export function buttonClassName(variant: Variant = "primary", className = "") {
  return `inline-flex h-8 items-center justify-center rounded-md px-2.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}
