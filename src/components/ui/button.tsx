import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-[#e0b122] disabled:opacity-60",
  secondary:
    "border border-border bg-surface-2 text-foreground hover:border-accent/40",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
};

export function buttonClassName(variant: Variant = "primary", className = "") {
  return `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`;
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
