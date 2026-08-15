import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string[] | string;
  hint?: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-foreground/90">{label}</span>
      <input
        name={name}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2"
        {...props}
      />
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      {message ? <p className="mt-1.5 text-xs text-risk">{message}</p> : null}
    </label>
  );
}
