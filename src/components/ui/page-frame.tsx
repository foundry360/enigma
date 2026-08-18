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
      <div className="p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex shrink-0 items-center gap-2 text-xl font-semibold tracking-tight">
            {icon}
            <span>{title}</span>
          </h1>
          {!description && actions ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          ) : null}
        </div>
        {description ? (
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-muted">{description}</p>
            {actions ? (
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="border-t border-border p-5 lg:p-6">{children}</div>
    </section>
  );
}
