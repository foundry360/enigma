import type { ReactNode, SelectHTMLAttributes } from "react";

export function SelectField({
  label,
  name,
  error,
  hint,
  id,
  layout = "vertical",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  error?: string[] | string;
  hint?: ReactNode;
  layout?: "vertical" | "horizontal";
  children: ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  const inputId = id ?? name;
  const horizontal = layout === "horizontal";

  return (
    <div
      className={
        horizontal
          ? "grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-x-3"
          : undefined
      }
    >
      <label
        htmlFor={inputId}
        className={
          horizontal
            ? "pt-2 text-sm font-medium text-foreground"
            : "mb-1.5 block text-sm font-medium text-foreground"
        }
      >
        {label}
      </label>
      <div>
        <select
          id={inputId}
          name={name}
          className={`h-9 w-full rounded-md border bg-background px-2.5 text-sm text-foreground outline-none ${
            message
              ? "border-accent focus:border-accent"
              : "border-border focus:border-accent"
          }`}
          {...props}
        >
          {children}
        </select>
        {hint ? <div className="mt-1.5 text-xs text-muted">{hint}</div> : null}
        {message ? (
          <div className="mt-1.5 text-xs text-accent">{message}</div>
        ) : null}
      </div>
    </div>
  );
}
