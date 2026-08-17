import type { ReactNode } from "react";

export function PageFrame({
  title,
  description,
  actions,
  icon,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between lg:p-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {icon}
            <span className="truncate">{title}</span>
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="border-t border-border p-5 lg:p-6">{children}</div>
    </section>
  );
}
